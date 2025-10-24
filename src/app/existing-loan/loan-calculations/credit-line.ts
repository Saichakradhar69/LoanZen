// src/app/existing-loan/loan-calculations/credit-line.ts

import { differenceInDays, format, isBefore, isSameDay } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

type LoanEvent = {
    date: Date;
    type: 'withdrawal' | 'repayment' | 'rate-change' | 'disbursement'; // Added disbursement
    amount: number;
    rate?: number;
};

export function calculateCreditLine(data: ExistingLoanFormData): CalculationResult {
    const {
        disbursementDate,
        interestRate,
        loanName,
        loanType,
        interestType,
    } = data;

    if (!disbursementDate) throw new Error("Disbursement date is required.");

    const firstUsageDate = new Date(disbursementDate);
    const asOfDate = new Date();

    let events: LoanEvent[] = [];

    // Add initial rate
    events.push({
        date: firstUsageDate,
        type: 'rate-change',
        amount: interestRate,
        rate: interestRate,
    });

    // Add rate changes
    (data.rateChanges || []).forEach(rc => {
        if (rc.date && rc.rate > 0) {
            events.push({ date: new Date(rc.date), type: 'rate-change', amount: rc.rate, rate: rc.rate });
        }
    });

    // Add withdrawals/disbursements and repayments from transactions array
    (data.transactions || []).forEach(t => {
        if (t.date && t.amount > 0) {
            events.push({ date: new Date(t.date), type: t.type, amount: t.amount });
        }
    });
     // Also consider the main disbursements array
    (data.disbursements || []).forEach(d => {
        if (d.date && d.amount > 0) {
            events.push({ date: new Date(d.date), type: 'disbursement', amount: d.amount });
        }
    });

    // Sort all events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    const schedule: Transaction[] = [];
    let balance = 0;
    let currentRate = interestRate;
    let interestPaidToDate = 0;
    let lastEventDate = events.length > 0 ? events[0].date : firstUsageDate;

    for (const event of events) {
        if (isBefore(event.date, lastEventDate) || !isBefore(lastEventDate, asOfDate)) continue;

        const days = differenceInDays(event.date, lastEventDate);
        let interestForPeriod = 0;
        if (days > 0 && balance > 0) {
            interestForPeriod = balance * (currentRate / 100 / 365.25) * days;
            balance += interestForPeriod; // Interest is capitalized before event
             schedule.push({
                date: format(event.date, 'yyyy-MM-dd'),
                type: 'interest',
                amount: interestForPeriod,
                principal: 0,
                interest: interestForPeriod,
                endingBalance: balance,
                note: 'Interest Capitalized'
            });
        }
        
        lastEventDate = event.date;

        switch (event.type) {
            case 'disbursement':
            case 'withdrawal':
                balance += event.amount;
                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: event.type, amount: event.amount, principal: event.amount, interest: 0, endingBalance: balance, note: 'Withdrawal/Disbursement' });
                break;
            case 'rate-change':
                currentRate = event.rate || currentRate;
                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'interest', amount: 0, principal: 0, interest: 0, endingBalance: balance, note: `Rate changed to ${currentRate}%` });
                break;
            case 'repayment':
                const interestComponent = Math.min(balance, interestForPeriod);
                const principalComponent = event.amount - interestComponent;
                
                balance -= event.amount;
                interestPaidToDate += interestComponent;

                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'repayment', amount: event.amount, principal: principalComponent, interest: interestComponent, endingBalance: balance, note: 'Repayment' });
                break;
        }
    }

    // Final interest accrual from last event to as-of date
    if (isBefore(lastEventDate, asOfDate)) {
        const finalDays = differenceInDays(asOfDate, lastEventDate);
        if (finalDays > 0 && balance > 0) {
            const finalInterest = balance * (currentRate / 100 / 365.25) * finalDays;
            balance += finalInterest;
            schedule.push({ date: format(asOfDate, 'yyyy-MM-dd'), type: 'interest', amount: finalInterest, principal: 0, interest: finalInterest, endingBalance: balance, note: 'Interest Accrued' });
        }
    }
    
    const originalLoanAmount = events.filter(e => e.type === 'withdrawal' || e.type === 'disbursement').reduce((sum, e) => sum + e.amount, 0);

    const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365.25 : 0;
    
    schedule.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const projectedTotalInterest = interestPaidToDate + (balance > 0 ? (balance * 0.1) : 0); // Rough projection

    return {
        outstandingBalance: balance,
        interestPaidToDate,
        nextEmiDate: null, // Credit lines don't have a fixed EMI date
        originalLoanAmount,
        loanName,
        loanType,
        interestType,
        interestRate: currentRate,
        perDayInterest,
        schedule,
        projectedTotalInterest,
    };
}
