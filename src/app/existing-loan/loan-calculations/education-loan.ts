
// src/app/existing-loan/loan-calculations/education-loan.ts

import { add, differenceInDays, format, isBefore, isAfter, setDate, isSameDay, startOfMonth, getDaysInMonth } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

type LoanEvent = {
    date: Date;
    type: 'disbursement' | 'repayment' | 'rate-change';
    amount: number;
    rate?: number;
    note?: string;
};

export function calculateEducationLoan(data: ExistingLoanFormData): CalculationResult {
    const {
        disbursementDate,
        interestRate,
        loanName,
        loanType,
        interestType,
        emiAmount = 0,
        emisPaid = 0,
        missedEmis = 0,
        paymentDueDay = 1,
        moratoriumPeriod = 0,
        moratoriumInterestType = 'none',
        moratoriumPaymentAmount = 0
    } = data;

    if (!disbursementDate) {
        throw new Error("Missing required disbursement date.");
    }
    
    // --- Phase 1: Build Event Timeline ---
    const firstDisbursementDate = new Date(disbursementDate);
    const asOfDate = new Date();
    let events: LoanEvent[] = [];

    // Add initial disbursement
    if (data.originalLoanAmount && data.originalLoanAmount > 0) {
        events.push({ date: firstDisbursementDate, type: 'disbursement', amount: data.originalLoanAmount, note: 'Initial Disbursement' });
    }
    // Add other disbursements
    data.disbursements?.forEach(d => events.push({ date: new Date(d.date), type: 'disbursement', amount: d.amount, note: 'Disbursement' }));

    // Add rate changes
    events.push({ date: firstDisbursementDate, type: 'rate-change', amount: interestRate, rate: interestRate, note: `Initial Rate: ${interestRate}%` });
    data.rateChanges?.forEach(rc => events.push({ date: new Date(rc.date), type: 'rate-change', amount: rc.rate, rate: rc.rate, note: `Rate changed to ${rc.rate}%` }));

    // Add scheduled EMI payments
    const moratoriumEndDate = add(firstDisbursementDate, { months: moratoriumPeriod });
    const firstEmiDate = setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay);

    for (let i = 0; i < emisPaid; i++) {
        const paymentDate = add(firstEmiDate, { months: i });
        const isMissed = i >= (emisPaid - missedEmis);
        if (isBefore(paymentDate, asOfDate) || isSameDay(paymentDate, asOfDate)) {
             events.push({ 
                date: paymentDate, 
                type: 'repayment', 
                amount: isMissed ? 0 : emiAmount,
                note: isMissed ? `EMI #${i + 1} (Missed)`: `EMI #${i + 1}`
            });
        }
    }
    
    // Add manual transactions (for custom scenarios, but can apply here too)
    data.transactions?.forEach(t => events.push({date: new Date(t.date), type: t.type, amount: t.amount, note: 'Manual Transaction'}));
    
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // --- Phase 2: Monthly Iterative Calculation ---
    const schedule: Transaction[] = [];
    let balance = 0;
    let totalInterestPaid = 0;
    let currentRate = interestRate;
    let currentDate = events.length > 0 ? startOfMonth(events[0].date) : firstDisbursementDate;
    
    while (isBefore(currentDate, asOfDate) || isSameDay(currentDate, asOfDate)) {
        const monthStartDate = currentDate;
        const monthEndDate = add(add(monthStartDate, {months: 1}), {days: -1});

        // 1. Process events for the month (disbursements, rate changes)
        const eventsThisMonth = events.filter(e => e.date >= monthStartDate && e.date <= monthEndDate);
        
        // Use rate from the start of the month
        const rateEvent = [...events].reverse().find(e => e.type === 'rate-change' && e.date <= monthStartDate);
        if (rateEvent?.rate) {
            currentRate = rateEvent.rate;
        }

        const monthlyInterestRate = currentRate / 100 / 12;

        // 2. Calculate interest for the month
        const interestForMonth = balance * monthlyInterestRate;

        // 3. Determine payment for the month
        let paymentForMonth = 0;
        let isMoratoriumMonth = isBefore(currentDate, moratoriumEndDate);

        if (isMoratoriumMonth) {
            switch(moratoriumInterestType) {
                case 'simple':
                    paymentForMonth = interestForMonth;
                    break;
                case 'partial':
                case 'fixed':
                    paymentForMonth = moratoriumPaymentAmount;
                    break;
                case 'none':
                default:
                    paymentForMonth = 0;
                    break;
            }
        } else {
             // Find EMI payment for this month if scheduled
            const emiEvent = eventsThisMonth.find(e => e.type === 'repayment');
            paymentForMonth = emiEvent ? emiEvent.amount : 0;
        }
        
        // 4. Calculate Principal Change & New Balance
        const interestComponent = Math.min(interestForMonth, paymentForMonth);
        const principalChange = paymentForMonth - interestForMonth;
        const closingBalance = balance - principalChange;

        // Log transaction for the month
        schedule.push({
            date: format(monthStartDate, 'yyyy-MM-dd'),
            type: 'repayment', // Generic term for the monthly calculation
            amount: paymentForMonth,
            principal: paymentForMonth > interestForMonth ? paymentForMonth - interestForMonth : 0,
            interest: interestComponent,
            endingBalance: closingBalance,
            note: isMoratoriumMonth ? `Moratorium (Interest: ${interestForMonth.toFixed(2)})` : `EMI Payment`
        });
        
        // Add disbursements for the month to balance AFTER interest calc
        eventsThisMonth.forEach(e => {
            if(e.type === 'disbursement') {
                schedule.push({
                    date: format(e.date, 'yyyy-MM-dd'),
                    type: 'disbursement', amount: e.amount, principal: e.amount,
                    interest: 0, endingBalance: balance + e.amount, note: e.note
                });
                balance += e.amount;
            }
        });

        // Update main balance and interest paid
        balance = closingBalance;
        totalInterestPaid += interestComponent;

        // Move to next month
        currentDate = add(monthStartDate, { months: 1 });
    }

    // Final accrual from last calc date to as-of date
    const lastCalcDate = add(currentDate, {months: -1});
    const daysSinceLastCalc = differenceInDays(asOfDate, lastCalcDate);
    if (daysSinceLastCalc > 0 && balance > 0) {
        const finalInterest = balance * (currentRate / 100 / 365.25) * daysSinceLastCalc;
        balance += finalInterest;
    }


    // --- Phase 3: Calculate Next EMI ---
    let nextEmiDate: Date | null = null;
    if (balance > 0) {
        let proposedDate = setDate(asOfDate, paymentDueDay);
        if (isBefore(proposedDate, asOfDate) || isSameDay(proposedDate, asOfDate)) {
            proposedDate = add(proposedDate, { months: 1 });
        }
        nextEmiDate = proposedDate;
    }
    
    const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365.25 : 0;

    const originalLoanAmount = (data.originalLoanAmount || 0) + (data.disbursements || []).reduce((acc, d) => acc + d.amount, 0);

    return {
        outstandingBalance: balance,
        interestPaidToDate: totalInterestPaid,
        nextEmiDate: nextEmiDate ? nextEmiDate.toISOString() : null,
        originalLoanAmount,
        loanName,
        loanType,
        interestType,
        interestRate: currentRate,
        perDayInterest,
        schedule,
        emiAmount,
    };
}
