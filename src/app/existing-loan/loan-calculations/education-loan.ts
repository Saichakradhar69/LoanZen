// src/app/existing-loan/loan-calculations/education-loan.ts

import { add, differenceInDays, format, isBefore, isAfter, setDate, isSameDay, startOfMonth } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

type LoanEvent = {
    date: Date;
    type: 'disbursement' | 'repayment' | 'rate-change' | 'interest-capitalization';
    amount: number;
    rate?: number;
    note?: string;
};

export function calculateEducationLoan(data: ExistingLoanFormData): CalculationResult {
    const {
        disbursementDate,
        interestRate = 0,
        moratoriumPeriod = 0,
        loanName = 'Education Loan',
        loanType = 'education',
        interestType = 'reducing',
        emiAmount = 0,
        emisPaid = 0,
        missedEmis = 0,
        paymentDueDay = 1,
    } = data;

    if (!disbursementDate) throw new Error("Disbursement date is required.");

    const firstDisbursementDate = new Date(disbursementDate);
    const moratoriumEndDate = add(firstDisbursementDate, { months: moratoriumPeriod });
    const asOfDate = new Date();
    
    // --- 1. Aggregate All Events ---
    const events: LoanEvent[] = [];

    // Add initial disbursement if it exists and no other disbursements are specified
    if (data.originalLoanAmount && data.originalLoanAmount > 0 && (!data.disbursements || data.disbursements.length === 0)) {
        events.push({
            date: firstDisbursementDate,
            type: 'disbursement',
            amount: data.originalLoanAmount,
            note: 'Initial Disbursement'
        });
    }

    // Add additional disbursements
    (data.disbursements || []).forEach((d, i) => {
        if (d.date && d.amount > 0) {
            events.push({ date: new Date(d.date), type: 'disbursement', amount: d.amount, note: `Disbursement #${i + 1}` });
        }
    });

    // Add initial and subsequent rate changes
    events.push({ date: firstDisbursementDate, type: 'rate-change', amount: interestRate, rate: interestRate, note: 'Initial Rate' });
    (data.rateChanges || []).forEach((rc, i) => {
        if (rc.date && rc.rate > 0) {
            events.push({ date: new Date(rc.date), type: 'rate-change', amount: rc.rate, rate: rc.rate, note: `Rate Change #${i + 1}` });
        }
    });

    // Add EMI payments
    if (emiAmount > 0 && emisPaid > 0) {
        let firstEmiDate = add(moratoriumEndDate, { months: 1 });
        firstEmiDate = setDate(firstEmiDate, paymentDueDay);
        const actualEmisPaid = emisPaid - missedEmis;

        for (let i = 0; i < actualEmisPaid; i++) {
            const paymentDate = add(firstEmiDate, { months: i });
            if (isBefore(paymentDate, asOfDate) || isSameDay(paymentDate, asOfDate)) {
                 events.push({ date: paymentDate, type: 'repayment', amount: emiAmount, note: `EMI #${i + 1}` });
            }
        }
    }
    
    // Add manual repayments
    (data.transactions || []).forEach((t) => {
        if (t.date && t.amount > 0 && t.type === 'repayment') {
            events.push({ date: new Date(t.date), type: 'repayment', amount: t.amount, note: 'Manual Repayment' });
        }
    });


    // Add a synthetic event for the end of the moratorium to trigger capitalization
    if (moratoriumPeriod > 0) {
        events.push({
            date: moratoriumEndDate,
            type: 'interest-capitalization',
            amount: 0,
            note: 'Moratorium Ends'
        });
    }

    // Sort all events chronologically
    events.sort((a, b) => a.date.getTime() - b.date.getTime());


    // --- 2. Process Events Day-by-Day ---
    const schedule: Transaction[] = [];
    let balance = 0;
    let currentRate = 0;
    let interestPaidToDate = 0;
    let accumulatedInterestDuringMoratorium = 0;

    let lastEventDate = events.length > 0 ? events[0].date : firstDisbursementDate;
    if (isAfter(firstDisbursementDate, lastEventDate)) {
        lastEventDate = firstDisbursementDate;
    }


    for (const event of events) {
        if (isBefore(event.date, lastEventDate)) continue;
        if (isAfter(event.date, asOfDate)) continue;

        // Calculate interest accrued since the last event
        const days = differenceInDays(event.date, lastEventDate);
        if (days > 0 && balance > 0) {
            const interestForPeriod = balance * (currentRate / 100 / 365.25) * days;
            
            // Check if the whole period is within moratorium
            if (isBefore(event.date, moratoriumEndDate) || isSameDay(event.date, moratoriumEndDate)) {
                accumulatedInterestDuringMoratorium += interestForPeriod;
            } else {
                // If the period spans the moratorium end date, we need to split the interest
                if (isBefore(lastEventDate, moratoriumEndDate)) {
                    const moratoriumDays = differenceInDays(moratoriumEndDate, lastEventDate);
                    const postMoratoriumDays = days - moratoriumDays;
                    
                    accumulatedInterestDuringMoratorium += balance * (currentRate / 100 / 365.25) * moratoriumDays;
                    balance += balance * (currentRate / 100 / 365.25) * postMoratoriumDays; // Accrue post-moratorium interest
                } else {
                     balance += interestForPeriod; // Regular interest accrual
                }
            }
        }
        
        lastEventDate = event.date;

        // Process the event itself
        switch (event.type) {
            case 'disbursement':
                balance += event.amount;
                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'disbursement', amount: event.amount, principal: event.amount, interest: 0, endingBalance: balance, note: event.note });
                break;
            case 'rate-change':
                currentRate = event.rate || currentRate;
                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'rate-change', amount: event.amount, principal: 0, interest: 0, endingBalance: balance, note: event.note });
                break;
             case 'interest-capitalization':
                if (accumulatedInterestDuringMoratorium > 0) {
                    balance += accumulatedInterestDuringMoratorium;
                    schedule.push({
                        date: format(event.date, 'yyyy-MM-dd'),
                        type: 'interest',
                        amount: accumulatedInterestDuringMoratorium,
                        principal: 0,
                        interest: accumulatedInterestDuringMoratorium,
                        endingBalance: balance,
                        note: 'Interest Capitalized'
                    });
                    accumulatedInterestDuringMoratorium = 0;
                }
                break;
            case 'repayment':
                const interestComponent = Math.min(balance, schedule.filter(s => s.type === 'interest' && new Date(s.date) <= event.date).reduce((acc, curr) => acc + curr.interest, 0));
                const principalComponent = event.amount - interestComponent;
                
                balance -= event.amount;
                interestPaidToDate += interestComponent;

                schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'repayment', amount: event.amount, principal: principalComponent, interest: interestComponent, endingBalance: balance, note: event.note });
                break;
        }
    }

    // --- 3. Final Interest Accrual to As-Of-Date ---
    if (isBefore(lastEventDate, asOfDate)) {
        const finalDays = differenceInDays(asOfDate, lastEventDate);
        if (finalDays > 0 && balance > 0) {
            const finalInterest = balance * (currentRate / 100 / 365.25) * finalDays;
            balance += finalInterest;
            schedule.push({ date: format(asOfDate, 'yyyy-MM-dd'), type: 'interest', amount: finalInterest, principal: 0, interest: finalInterest, endingBalance: balance, note: 'Interest accrued to date' });
        }
    }
    
    // --- 4. Calculate Final Results ---
    const originalLoanAmount = events.filter(e => e.type === 'disbursement').reduce((sum, e) => sum + e.amount, 0);

    let nextEmiDate: Date | null = null;
    if (balance > 0 && emiAmount && emisPaid !== undefined) {
        let proposedNextDate: Date;
        if(emisPaid > 0) {
            const lastEmiDate = add(setDate(add(moratoriumEndDate, {months: 1}), paymentDueDay), { months: emisPaid -1});
            proposedNextDate = add(lastEmiDate, { months: 1 });
        } else {
            proposedNextDate = setDate(add(moratoriumEndDate, {months: 1}), paymentDueDay);
        }

        if (isBefore(proposedNextDate, asOfDate)) {
             let nextDateFromToday = setDate(asOfDate, paymentDueDay);
             if (isBefore(nextDateFromToday, asOfDate) || isSameDay(nextDateFromToday, asOfDate)) {
                 nextDateFromToday = add(nextDateFromToday, { months: 1 });
             }
             proposedNextDate = nextDateFromToday;
        }
        nextEmiDate = proposedNextDate;
    }
    
    const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365.25 : 0;
    
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
