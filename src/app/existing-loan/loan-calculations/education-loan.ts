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
    let currentRate = interestRate; 
    let interestPaidToDate = 0;
    let accumulatedInterestDuringMoratorium = 0;
    
    let lastEventDate = events.length > 0 ? events[0].date : firstDisbursementDate;
    let moratoriumInterestCapitalized = false;


    for (const event of events) {
        if (isSameDay(event.date, lastEventDate) && event.type !== 'disbursement' && event.type !== 'rate-change' && balance === 0) {
            lastEventDate = event.date;
        }

        let interestForPeriod = 0;
        const days = differenceInDays(event.date, lastEventDate);
        if (days > 0 && balance > 0) {
             interestForPeriod = balance * (currentRate / 100 / 365.25) * days;
        }

        // Check if we crossed the moratorium boundary
        if (isBefore(lastEventDate, moratoriumEndDate) && !isBefore(event.date, moratoriumEndDate) && !moratoriumInterestCapitalized) {
            const daysInMoratorium = differenceInDays(moratoriumEndDate, lastEventDate);
            const interestTillMoratoriumEnd = balance * (currentRate / 100 / 365.25) * daysInMoratorium;
            accumulatedInterestDuringMoratorium += interestTillMoratoriumEnd;
            
            balance += accumulatedInterestDuringMoratorium;
            schedule.push({
                date: format(moratoriumEndDate, 'yyyy-MM-dd'), type: 'interest', amount: accumulatedInterestDuringMoratorium,
                principal: 0, interest: accumulatedInterestDuringMoratorium, endingBalance: balance, note: 'Interest Capitalized'
            });
            moratoriumInterestCapitalized = true;

            const daysAfterMoratorium = differenceInDays(event.date, moratoriumEndDate);
            interestForPeriod = balance * (currentRate / 100 / 365.25) * daysAfterMoratorium;
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
                let principalComponent = 0;
                let interestComponent = 0;
                
                if (isBefore(event.date, moratoriumEndDate)) { // Payment during moratorium
                    interestComponent = Math.min(event.amount, accumulatedInterestDuringMoratorium + interestForPeriod);
                    accumulatedInterestDuringMoratorium -= interestComponent;
                    interestPaidToDate += interestComponent;
                    principalComponent = event.amount - interestComponent;
                    balance -= principalComponent; // Apply extra to principal
                } else { // Payment after moratorium
                    balance += interestForPeriod; // Capitalize interest before payment
                    interestComponent = Math.min(event.amount, interestForPeriod);
                    interestPaidToDate += interestComponent;
                    principalComponent = event.amount - interestComponent;
                    balance -= event.amount;
                }
                
                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'repayment', amount: event.amount, principal: principalComponent, interest: interestComponent, endingBalance: balance, note: 'Repayment' });
                break;
        }
    }
    
     // Final interest accrual from the last event to today
    if (isBefore(lastEventDate, asOfDate)) {
        if (isBefore(lastEventDate, moratoriumEndDate) && !isBefore(asOfDate, moratoriumEndDate) && !moratoriumInterestCapitalized) {
             const daysInMoratorium = differenceInDays(moratoriumEndDate, lastEventDate);
             accumulatedInterestDuringMoratorium += balance * (currentRate / 100 / 365.25) * daysInMoratorium;
             
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
                 // Don't add to balance yet, it's just tracked
             } else {
                const finalInterest = balance * (currentRate / 100 / 365.25) * days;
                balance += finalInterest;
                schedule.push({ date: format(asOfDate, 'yyyy-MM-dd'), type: 'interest', amount: finalInterest, principal: 0, interest: finalInterest, endingBalance: balance, note: 'Interest Accrued to Date' });
             }
        }
    }
    
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

        if (isBefore(proposedNextDate, asOfDate)) {
            let nextDate = setDate(asOfDate, paymentDueDay);
            if(isBefore(nextDate, asOfDate) || isSameDay(nextDate, asOfDate)) {
                nextDate = add(nextDate, { months: 1});
            }
            proposedNextDate = nextDate;
        }
        nextEmiDate = proposedNextDate;
    }
    
    const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365.25 : 0;
    
    // Sort final schedule by date
    schedule.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        outstandingBalance: balance,
        interestPaidToDate: interestPaidToDate,
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
