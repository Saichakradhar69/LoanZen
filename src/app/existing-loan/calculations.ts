
// src/app/existing-loan/calculations.ts

import { add, differenceInDays, format, setDate, startOfMonth, isBefore, isSameDay, getDaysInMonth } from 'date-fns';
import type { ExistingLoanFormData } from './form';
import type { CalculationResult, Transaction } from './actions';


function sortAndCombineEvents(data: ExistingLoanFormData): any[] {
    let events: any[] = [];
    
    if (!data.disbursementDate) {
        return [];
    }

    const disbursementDate = new Date(data.disbursementDate);

    // Use originalLoanAmount as first disbursement if no specific disbursements are listed
    if (data.originalLoanAmount && data.originalLoanAmount > 0 && (!data.disbursements || data.disbursements.length === 0)) {
        events.push({
            date: disbursementDate,
            type: 'disbursement',
            amount: data.originalLoanAmount,
        });
    }

    if (data.disbursements && data.disbursements.length > 0) {
        data.disbursements.forEach(d => {
            if (d.date && d.amount > 0) {
                events.push({
                    date: new Date(d.date),
                    type: 'disbursement',
                    amount: d.amount
                });
            }
        });
    }

    // Add the initial rate as the first rate change event
    events.push({
        date: disbursementDate,
        type: 'rate-change',
        rate: data.interestRate,
        amount: 0,
    });
    if (data.rateType === 'floating' && data.rateChanges) {
        data.rateChanges.forEach(rc => {
            if (rc.date && rc.rate > 0) {
                events.push({
                    date: new Date(rc.date),
                    type: 'rate-change',
                    rate: rc.rate,
                    amount: 0
                });
            }
        });
    }

    const paymentDueDay = data.paymentDueDay || disbursementDate.getDate();

    if ((data.paymentStructure === 'fixed' || ['personal', 'car', 'home'].includes(data.loanType)) && data.emiAmount && data.emisPaid && data.emisPaid > 0) {
        
        let firstEmiDateSource = disbursementDate;
         if (data.loanType === 'education' && data.disbursements && data.disbursements.length > 0) {
             const lastDisbursement = data.disbursements.reduce((latest, d) => new Date(d.date) > new Date(latest.date) ? d : latest);
             firstEmiDateSource = new Date(lastDisbursement.date);
         }

        let firstEmiDate = add(firstEmiDateSource, { months: 1 + (data.moratoriumPeriod || 0) });
        firstEmiDate = setDate(firstEmiDate, paymentDueDay);
        
        for (let i = 0; i < data.emisPaid; i++) {
            const paymentDate = add(firstEmiDate, { months: i });
            if (paymentDate <= new Date()) {
                events.push({
                    date: paymentDate,
                    type: 'repayment',
                    amount: data.emiAmount,
                });
            }
        }
    } else if (data.transactions) { // Catches education loan repayments, custom loan variable, and credit line
         data.transactions.forEach(t => {
            if (t.date && t.amount > 0) {
             events.push({ ...t, date: new Date(t.date) });
            }
        });
    }
    
    // Sort by date, then by type to prioritize disbursements and rate changes on the same day
    return events.sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        // Prioritization for same-day events
        const typePriority = (type: string) => {
            switch (type) {
                case 'disbursement': return 1;
                case 'rate-change': return 2;
                case 'repayment': return 3;
                case 'withdrawal': return 4;
                default: return 5;
            }
        };
        return typePriority(a.type) - typePriority(b.type);
    });
}


export function performExistingLoanCalculations(data: ExistingLoanFormData): CalculationResult {
    const events = sortAndCombineEvents(data);
    const schedule: Transaction[] = [];
    const asOfDate = new Date();

    if (events.length === 0 || !data.disbursementDate) {
        return {
            outstandingBalance: 0,
            interestPaidToDate: 0,
            nextEmiDate: null,
            originalLoanAmount: data.originalLoanAmount || 0,
            loanName: data.loanName,
            loanType: data.loanType,
            interestType: data.interestType,
            interestRate: data.interestRate,
            perDayInterest: 0,
            schedule: [],
            emiAmount: data.emiAmount,
        };
    }
    
    let balance = 0;
    let totalInterestPaid = 0;
    
    const firstEventDate = events[0].date;
    const moratoriumEndDate = data.moratoriumPeriod ? add(firstEventDate, { months: data.moratoriumPeriod }) : firstEventDate;
    
    let currentDate = startOfMonth(firstEventDate);
    let eventIndex = 0;
    let currentRate = data.interestRate;

    while (isBefore(currentDate, asOfDate) || isSameDay(currentDate, startOfMonth(asOfDate))) {
        const daysInMonth = getDaysInMonth(currentDate);
        
        let monthStartDate = startOfMonth(currentDate);
        let interestForMonth = 0;
        let lastInterestCalcDate = monthStartDate;

        // Find all events within the current month
        const monthEvents = [];
        while(eventIndex < events.length && events[eventIndex].date.getFullYear() === currentDate.getFullYear() && events[eventIndex].date.getMonth() === currentDate.getMonth()){
            monthEvents.push(events[eventIndex]);
            eventIndex++;
        }

        for (const event of monthEvents) {
            const days = differenceInDays(event.date, lastInterestCalcDate);
            if (days > 0 && balance > 0) {
                 const interest = balance * (currentRate / 100 / 365.25) * days;
                 interestForMonth += interest;
            }
            lastInterestCalcDate = event.date;

            switch (event.type) {
                case 'disbursement':
                case 'withdrawal':
                    balance += event.amount;
                    schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: event.type, amount: event.amount, principal: event.amount, interest: 0, endingBalance: balance, note: `Amount ${event.type}`});
                    break;
                case 'rate-change':
                    currentRate = event.rate;
                    schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: event.type, amount: event.rate, principal: 0, interest: 0, endingBalance: balance, note: `Rate changed to ${event.rate}%`});
                    break;
                case 'repayment':
                    // Repayments only apply after the moratorium period
                    if (isBefore(moratoriumEndDate, event.date) || isSameDay(moratoriumEndDate, event.date)) {
                        const interestComponent = Math.min(balance, interestForMonth);
                        const principalComponent = event.amount - interestComponent;
                        
                        balance -= event.amount;
                        totalInterestPaid += interestComponent;
                        interestForMonth -= interestComponent;

                        schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: event.type, amount: event.amount, principal: principalComponent, interest: interestComponent, endingBalance: balance, note: `Repayment`});
                    }
                    break;
            }
        }
        
        // --- End of month interest calculation ---
        const nextMonthStartDate = add(monthStartDate, { months: 1 });
        const endDateForInterest = isBefore(nextMonthStartDate, asOfDate) ? nextMonthStartDate : asOfDate;
        const remainingDays = differenceInDays(endDateForInterest, lastInterestCalcDate);
        if (remainingDays > 0 && balance > 0) {
            const interest = balance * (currentRate / 100 / 365.25) * remainingDays;
            interestForMonth += interest;
        }
        
        // Capitalize all interest at the end of the month
        if (interestForMonth > 0) {
            balance += interestForMonth;
            const capitalizationDate = isBefore(nextMonthStartDate, asOfDate) ? add(nextMonthStartDate, {days: -1}) : asOfDate;
            schedule.push({ date: format(capitalizationDate, 'yyyy-MM-dd'), type: 'interest', amount: interestForMonth, principal: 0, interest: interestForMonth, endingBalance: balance, note: 'Interest Capitalized' });
        }
        
        currentDate = add(currentDate, { months: 1 });
    }
    
    // --- Final Data Aggregation ---
    const originalLoanAmount = events
        .filter(e => e.type === 'disbursement' || e.type === 'withdrawal')
        .reduce((sum, e) => sum + e.amount, 0);
        
    let nextEmiDate: Date | null = null;
    if (balance > 0) {
        const paymentDueDay = data.paymentDueDay || firstEventDate.getDate();
        let proposedDate = setDate(startOfMonth(asOfDate), paymentDueDay);
        if (isBefore(proposedDate, asOfDate) || isSameDay(proposedDate, asOfDate)) {
            proposedDate = add(proposedDate, { months: 1 });
        }
        nextEmiDate = proposedDate;
    }

    const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365.25 : 0;
    
    // Sort schedule by date for final report
    schedule.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        outstandingBalance: balance,
        interestPaidToDate: totalInterestPaid,
        nextEmiDate: nextEmiDate ? nextEmiDate.toISOString() : null,
        originalLoanAmount,
        loanName: data.loanName,
        loanType: data.loanType,
        interestType: data.interestType,
        interestRate: currentRate,
        perDayInterest: perDayInterest,
        schedule,
        emiAmount: data.emiAmount,
    };
}
