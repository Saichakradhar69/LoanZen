// src/app/existing-loan/loan-calculations/education-loan.ts

import { add, differenceInDays, format, isBefore, isSameDay, setDate } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

type LoanEvent = {
    date: Date;
    type: 'disbursement' | 'repayment' | 'rate-change';
    amount: number;
    rate?: number;
};

export function calculateEducationLoan(data: ExistingLoanFormData): CalculationResult {
    const {
        disbursementDate,
        interestRate,
        moratoriumPeriod = 0,
        loanName,
        loanType,
        interestType,
        emiAmount,
    } = data;

    if (!disbursementDate) throw new Error("Disbursement date is required.");

    const firstDisbursementDate = new Date(disbursementDate);
    const moratoriumEndDate = add(firstDisbursementDate, { months: moratoriumPeriod });
    const asOfDate = new Date();

    let events: LoanEvent[] = [];
    // Add initial disbursement from main form
     if (data.originalLoanAmount && data.originalLoanAmount > 0 && (!data.disbursements || data.disbursements.length === 0)) {
        events.push({
            date: firstDisbursementDate,
            type: 'disbursement',
            amount: data.originalLoanAmount,
        });
    }

    // Add additional disbursements
    (data.disbursements || []).forEach(d => {
        if (d.date && d.amount > 0) {
            events.push({ date: new Date(d.date), type: 'disbursement', amount: d.amount });
        }
    });
    
    // Add initial rate
    events.push({
        date: firstDisbursementDate,
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
    
    const paymentDueDay = data.paymentDueDay || firstDisbursementDate.getDate();

    // Handle both fixed EMI payments and variable repayments
    if ((data.paymentStructure === 'fixed' || ['personal', 'car', 'home', 'education'].includes(data.loanType)) && data.emiAmount && data.emisPaid && data.emisPaid > 0) {
        let firstEmiSource = moratoriumEndDate;
        // If there were disbursements, the EMI should start after the last one + moratorium
        if (data.disbursements && data.disbursements.length > 0) {
             const lastDisbursementDate = data.disbursements.map(d => new Date(d.date)).sort((a,b) => b.getTime() - a.getTime())[0];
             firstEmiSource = add(lastDisbursementDate, { months: moratoriumPeriod });
        }
        
        let firstEmiDate = add(firstEmiSource, { months: 1 });
        firstEmiDate = setDate(firstEmiDate, paymentDueDay);
        
        for (let i = 0; i < data.emisPaid; i++) {
            const paymentDate = add(firstEmiDate, { months: i });
             if (isBefore(paymentDate, asOfDate) || isSameDay(paymentDate, asOfDate)) {
                 events.push({ date: paymentDate, type: 'repayment', amount: data.emiAmount });
             }
        }
    } else if (data.transactions) {
         (data.transactions || []).forEach(t => {
            if (t.date && t.amount > 0 && t.type === 'repayment') {
                events.push({ date: new Date(t.date), type: 'repayment', amount: t.amount });
            }
        });
    }

    // Sort all events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const schedule: Transaction[] = [];
    let balance = 0;
    let currentRate = interestRate;
    let interestPaidToDate = 0;
    let lastEventDate = events.length > 0 ? events[0].date : firstDisbursementDate;
    
    let accumulatedInterestDuringMoratorium = 0;

    for (const event of events) {
        if (isBefore(event.date, lastEventDate)) continue;

        const days = differenceInDays(event.date, lastEventDate);
        if (days > 0 && balance > 0) {
            const interest = balance * (currentRate / 100 / 365.25) * days;
            // If we are within the moratorium period
            if (isBefore(event.date, moratoriumEndDate)) {
                accumulatedInterestDuringMoratorium += interest;
            } else {
                 // First event after moratorium, capitalize interest
                 if (isBefore(lastEventDate, moratoriumEndDate)) {
                     const remainingMoratoriumDays = differenceInDays(moratoriumEndDate, lastEventDate);
                     const remainingMoratoriumInterest = balance * (currentRate / 100 / 365.25) * remainingMoratoriumDays;
                     accumulatedInterestDuringMoratorium += remainingMoratoriumInterest;
                     
                     balance += accumulatedInterestDuringMoratorium;
                     schedule.push({
                         date: format(moratoriumEndDate, 'yyyy-MM-dd'),
                         type: 'interest',
                         amount: accumulatedInterestDuringMoratorium,
                         principal: 0,
                         interest: accumulatedInterestDuringMoratorium,
                         endingBalance: balance,
                         note: 'Interest Capitalized'
                     });
                     accumulatedInterestDuringMoratorium = 0; // Reset
                     lastEventDate = moratoriumEndDate;
                 }
                
                 const postMoratoriumDays = differenceInDays(event.date, lastEventDate);
                 const interestPostMoratorium = balance * (currentRate / 100 / 365.25) * postMoratoriumDays;
                 balance += interestPostMoratorium;
                 schedule.push({
                    date: format(event.date, 'yyyy-MM-dd'),
                    type: 'interest',
                    amount: interestPostMoratorium,
                    principal: 0,
                    interest: interestPostMoratorium,
                    endingBalance: balance,
                    note: 'Interest Accrued'
                });
            }
        }
        
        lastEventDate = event.date;

        switch (event.type) {
            case 'disbursement':
                balance += event.amount;
                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: event.type, amount: event.amount, principal: event.amount, interest: 0, endingBalance: balance, note: 'Disbursement' });
                break;
            case 'rate-change':
                currentRate = event.rate || currentRate;
                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: event.type, amount: event.amount, principal: 0, interest: 0, endingBalance: balance, note: `Rate changed to ${currentRate}%` });
                break;
            case 'repayment':
                if (isBefore(event.date, moratoriumEndDate)) continue; // Ignore repayments during moratorium
                const interestComponent = Math.min(balance, schedule.filter(s => s.type === 'interest' && new Date(s.date) <= event.date).reduce((acc, curr) => acc + curr.interest, 0));
                const principalComponent = event.amount - interestComponent;
                
                balance -= event.amount;
                interestPaidToDate += interestComponent;
                
                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'repayment', amount: event.amount, principal: principalComponent, interest: interestComponent, endingBalance: balance, note: 'Repayment' });
                break;
        }
    }
    
     // Final interest accrual from last event to as-of date
    if (isBefore(lastEventDate, asOfDate)) {
        const days = differenceInDays(asOfDate, lastEventDate);
        if (days > 0 && balance > 0) {
            if (isBefore(lastEventDate, moratoriumEndDate) && isBefore(asOfDate, moratoriumEndDate)) {
                 const interest = balance * (currentRate / 100 / 365.25) * days;
                 accumulatedInterestDuringMoratorium += interest;
                 balance += interest;
                  schedule.push({ date: format(asOfDate, 'yyyy-MM-dd'), type: 'interest', amount: interest, principal: 0, interest: interest, endingBalance: balance, note: 'Interest Accrued (Moratorium)' });

            } else {
                 if (isBefore(lastEventDate, moratoriumEndDate)) {
                     const remainingMoratoriumDays = differenceInDays(moratoriumEndDate, lastEventDate);
                     const remainingMoratoriumInterest = balance * (currentRate / 100 / 365.25) * remainingMoratoriumDays;
                     accumulatedInterestDuringMoratorium += remainingMoratoriumInterest;
                     
                     balance += accumulatedInterestDuringMoratorium;
                     schedule.push({
                         date: format(moratoriumEndDate, 'yyyy-MM-dd'),
                         type: 'interest',
                         amount: accumulatedInterestDuringMoratorium,
                         principal: 0,
                         interest: accumulatedInterestDuringMoratorium,
                         endingBalance: balance,
                         note: 'Interest Capitalized'
                     });
                     lastEventDate = moratoriumEndDate;
                 }
                const finalDays = differenceInDays(asOfDate, lastEventDate);
                const finalInterest = balance * (currentRate / 100 / 365.25) * finalDays;
                balance += finalInterest;
                schedule.push({ date: format(asOfDate, 'yyyy-MM-dd'), type: 'interest', amount: finalInterest, principal: 0, interest: finalInterest, endingBalance: balance, note: 'Interest Accrued' });
            }
        }
    }

    const originalLoanAmount = events.filter(e => e.type === 'disbursement').reduce((sum, e) => sum + e.amount, 0);

    let nextEmiDate: Date | null = null;
    if (balance > 0) {
        let proposedDate = setDate(add(moratoriumEndDate, {months: 1}), paymentDueDay);
        while (isBefore(proposedDate, asOfDate)) {
            proposedDate = add(proposedDate, { months: 1 });
        }
         nextEmiDate = proposedDate;
    }
    
    const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365.25 : 0;

    // Sort final schedule by date
    schedule.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        outstandingBalance: balance,
        interestPaidToDate,
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