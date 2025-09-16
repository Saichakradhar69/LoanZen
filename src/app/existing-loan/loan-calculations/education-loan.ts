// src/app/existing-loan/loan-calculations/education-loan.ts

import { add, differenceInDays, format, isBefore, isSameDay, setDate, startOfMonth } from 'date-fns';
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
        emisPaid,
    } = data;

    if (!disbursementDate) throw new Error("Disbursement date is required.");

    const firstDisbursementDate = new Date(disbursementDate);
    const moratoriumEndDate = add(firstDisbursementDate, { months: moratoriumPeriod });
    const asOfDate = new Date();

    let events: LoanEvent[] = [];
    // Add initial disbursement from main form if it's the only one
     if (data.originalLoanAmount && data.originalLoanAmount > 0 && (!data.disbursements || data.disbursements.length === 0)) {
        events.push({
            date: firstDisbursementDate,
            type: 'disbursement',
            amount: data.originalLoanAmount,
        });
    }

    // Add additional disbursements from the array
    (data.disbursements || []).forEach(d => {
        if (d.date && d.amount > 0) {
            events.push({ date: new Date(d.date), type: 'disbursement', amount: d.amount });
        }
    });
    
    // Add initial interest rate
    events.push({
        date: firstDisbursementDate,
        type: 'rate-change',
        amount: interestRate,
        rate: interestRate,
    });

    // Add subsequent rate changes
    (data.rateChanges || []).forEach(rc => {
        if (rc.date && rc.rate > 0) {
            events.push({ date: new Date(rc.date), type: 'rate-change', amount: rc.rate, rate: rc.rate });
        }
    });
    
    const paymentDueDay = data.paymentDueDay || firstDisbursementDate.getDate();

    // Handle fixed EMI payments
    if (data.emiAmount && data.emisPaid && data.emisPaid > 0) {
        let firstEmiSourceDate = moratoriumEndDate;
        // The first EMI starts one month after the moratorium, which itself starts from the *first* disbursement date.
        
        let firstEmiDate = add(firstEmiSourceDate, { months: 1 });
        firstEmiDate = setDate(firstEmiDate, paymentDueDay);
        
        for (let i = 0; i < data.emisPaid; i++) {
            const paymentDate = add(firstEmiDate, { months: i });
             if (isBefore(paymentDate, asOfDate) || isSameDay(paymentDate, asOfDate)) {
                 events.push({ date: paymentDate, type: 'repayment', amount: data.emiAmount });
             }
        }
    }
    
    // Handle manual/variable repayments
    (data.transactions || []).forEach(t => {
        if (t.date && t.amount > 0 && t.type === 'repayment') {
            events.push({ date: new Date(t.date), type: 'repayment', amount: t.amount });
        }
    });

    // Sort all events chronologically
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const schedule: Transaction[] = [];
    let balance = 0;
    let currentRate = interestRate; // Will be set by the first rate-change event
    let interestPaidToDate = 0;
    let accumulatedInterestDuringMoratorium = 0;
    
    // Use the date of the very first event as the starting point for calculations
    let lastEventDate = events.length > 0 ? events[0].date : firstDisbursementDate;
    let moratoriumInterestCapitalized = false;


    for (const event of events) {
        // Skip events with the same date as the last one to avoid double counting interest
        if (isSameDay(event.date, lastEventDate) && event.type !== 'disbursement' && event.type !== 'rate-change' && balance === 0) {
            lastEventDate = event.date;
        }

        // Calculate interest accrued since the last event
        const days = differenceInDays(event.date, lastEventDate);
        if (days > 0 && balance > 0) {
            
            // Check if this interest period crosses the moratorium end date
            if (isBefore(lastEventDate, moratoriumEndDate) && isBefore(moratoriumEndDate, event.date)) {
                const daysBeforeMoratoriumEnd = differenceInDays(moratoriumEndDate, lastEventDate);
                
                // Accrue and capitalize moratorium interest
                accumulatedInterestDuringMoratorium += balance * (currentRate / 100 / 365.25) * daysBeforeMoratoriumEnd;
                balance += accumulatedInterestDuringMoratorium;
                schedule.push({
                    date: format(moratoriumEndDate, 'yyyy-MM-dd'), type: 'interest', amount: accumulatedInterestDuringMoratorium,
                    principal: 0, interest: accumulatedInterestDuringMoratorium, endingBalance: balance, note: 'Interest Capitalized'
                });
                moratoriumInterestCapitalized = true;
                accumulatedInterestDuringMoratorium = 0; // Reset

                // Accrue and add post-moratorium interest
                const daysAfterMoratoriumEnd = differenceInDays(event.date, moratoriumEndDate);
                const postMoratoriumInterest = balance * (currentRate / 100 / 365.25) * daysAfterMoratoriumEnd;
                balance += postMoratoriumInterest;
                schedule.push({
                    date: format(event.date, 'yyyy-MM-dd'), type: 'interest', amount: postMoratoriumInterest,
                    principal: 0, interest: postMoratoriumInterest, endingBalance: balance, note: 'Interest Accrued'
                });
            } else if (!isBefore(event.date, moratoriumEndDate)) { // Post-moratorium
                 const interest = balance * (currentRate / 100 / 365.25) * days;
                 balance += interest;
                 schedule.push({
                    date: format(event.date, 'yyyy-MM-dd'), type: 'interest', amount: interest,
                    principal: 0, interest: interest, endingBalance: balance, note: 'Interest Accrued'
                });
            } else { // During moratorium
                const interest = balance * (currentRate / 100 / 365.25) * days;
                accumulatedInterestDuringMoratorium += interest;
            }
        }
        
        // Process the current event
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

                 // If moratorium interest hasn't been capitalized yet, do it now.
                if (!moratoriumInterestCapitalized && accumulatedInterestDuringMoratorium > 0) {
                    balance += accumulatedInterestDuringMoratorium;
                     schedule.push({
                        date: format(moratoriumEndDate, 'yyyy-MM-dd'), type: 'interest', amount: accumulatedInterestDuringMoratorium,
                        principal: 0, interest: accumulatedInterestDuringMoratorium, endingBalance: balance, note: 'Interest Capitalized'
                    });
                    moratoriumInterestCapitalized = true;
                    accumulatedInterestDuringMoratorium = 0; // Reset
                }
                
                // Repayment logic assumes interest is already added to balance
                balance -= event.amount;
                // A full amortization split is too complex here, so we simplify.
                // The main goal is the final outstanding balance.
                interestPaidToDate += 0; 
                
                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'repayment', amount: event.amount, principal: event.amount, interest: 0, endingBalance: balance, note: 'Repayment' });
                break;
        }
    }
    
     // Final interest accrual from the last event to today
    if (isBefore(lastEventDate, asOfDate)) {
        
        if (isBefore(lastEventDate, moratoriumEndDate) && !isBefore(asOfDate, moratoriumEndDate)) {
             // Case where the "as of date" crosses the moratorium boundary
             const daysBeforeMoratoriumEnd = differenceInDays(moratoriumEndDate, lastEventDate);
             accumulatedInterestDuringMoratorium += balance * (currentRate / 100 / 365.25) * daysBeforeMoratoriumEnd;
             
             balance += accumulatedInterestDuringMoratorium;
             schedule.push({
                date: format(moratoriumEndDate, 'yyyy-MM-dd'), type: 'interest', amount: accumulatedInterestDuringMoratorium,
                principal: 0, interest: accumulatedInterestDuringMoratorium, endingBalance: balance, note: 'Interest Capitalized'
             });
             moratoriumInterestCapitalized = true;
             lastEventDate = moratoriumEndDate;
        }

        const days = differenceInDays(asOfDate, lastEventDate);
        if (days > 0 && balance > 0) {
             if (isBefore(asOfDate, moratoriumEndDate)) {
                 const interest = balance * (currentRate / 100 / 365.25) * days;
                 accumulatedInterestDuringMoratorium += interest;
             } else {
                 if (!moratoriumInterestCapitalized && accumulatedInterestDuringMoratorium > 0) {
                    balance += accumulatedInterestDuringMoratorium;
                     schedule.push({
                        date: format(moratoriumEndDate, 'yyyy-MM-dd'), type: 'interest', amount: accumulatedInterestDuringMoratorium,
                        principal: 0, interest: accumulatedInterestDuringMoratorium, endingBalance: balance, note: 'Interest Capitalized'
                    });
                    moratoriumInterestCapitalized = true;
                 }
                const finalInterest = balance * (currentrate / 100 / 365.25) * days;
                balance += finalInterest;
                schedule.push({ date: format(asOfDate, 'yyyy-MM-dd'), type: 'interest', amount: finalInterest, principal: 0, interest: finalInterest, endingBalance: balance, note: 'Interest Accrued to Date' });
             }
        }
    }
    
    // If today is after moratorium but no other event has occurred to capitalize.
     if (isBefore(moratoriumEndDate, asOfDate) && !moratoriumInterestCapitalized && accumulatedInterestDuringMoratorium > 0) {
        balance += accumulatedInterestDuringMoratorium;
        schedule.push({
            date: format(moratoriumEndDate, 'yyyy-MM-dd'), type: 'interest', amount: accumulatedInterestDuringMoratorium,
            principal: 0, interest: accumulatedInterestDuringMoratorium, endingBalance: balance, note: 'Interest Capitalized'
        });
     }


    const originalLoanAmount = events.filter(e => e.type === 'disbursement').reduce((sum, e) => sum + e.amount, 0);

    let nextEmiDate: Date | null = null;
    if (balance > 0 && emiAmount && emisPaid !== undefined) {
        const firstPossibleEmiDate = setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay);
        const lastPaidEmiDate = add(firstPossibleEmiDate, { months: emisPaid > 0 ? emisPaid - 1 : 0 });
        
        let proposedNextDate = emisPaid > 0 ? add(lastPaidEmiDate, { months: 1 }) : firstPossibleEmiDate;

        // If the proposed date is in the past, find the next valid one.
        if (isBefore(proposedNextDate, asOfDate)) {
            let nextDate = setDate(asOfDate, paymentDueDay);
            if(isBefore(nextDate, asOfDate)) {
                // If this month's due day has already passed, move to next month.
                nextDate = add(nextDate, { months: 1});
            }
            proposedNextDate = nextDate;
        }
        nextEmiDate = proposedNextDate;
    }
    
    const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365.25 : 0;
    
    const totalPayments = schedule.filter(s=>s.type==='repayment').reduce((sum, s) => sum + s.amount, 0);
    const totalInterestAccrued = (balance + totalPayments) - originalLoanAmount;

    // Sort final schedule by date
    schedule.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        outstandingBalance: balance,
        interestPaidToDate: Math.max(0, totalInterestAccrued),
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
