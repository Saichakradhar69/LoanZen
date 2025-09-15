
// src/app/existing-loan/calculations.ts

import { add, differenceInDays, format, setDate, startOfMonth, isBefore, isSameDay } from 'date-fns';
import type { ExistingLoanFormData } from './form';
import type { CalculationResult, Transaction } from './actions';


function sortAndCombineEvents(data: ExistingLoanFormData): any[] {
    let events: any[] = [];
    
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
            events.push({
                date: new Date(d.date),
                type: 'disbursement',
                amount: d.amount
            });
        });
    }

    if (data.rateType === 'floating' && data.rateChanges) {
        // Add the initial rate as the first rate change event
        events.push({
            date: disbursementDate,
            type: 'rate-change',
            rate: data.interestRate,
            amount: 0,
        });
        data.rateChanges.forEach(rc => {
            events.push({
                date: new Date(rc.date),
                type: 'rate-change',
                rate: rc.rate,
                amount: 0
            });
        });
    } else {
         events.push({
            date: disbursementDate,
            type: 'rate-change',
            rate: data.interestRate,
            amount: 0,
        });
    }

    const paymentDueDay = data.paymentDueDay || disbursementDate.getDate();

    if ((data.paymentStructure === 'fixed' || ['personal', 'car', 'home'].includes(data.loanType)) && data.emiAmount && data.emisPaid && data.emisPaid > 0) {
        
        let firstEmiDateSource = disbursementDate;
         // For Education loans, EMI starts after last disbursement + moratorium
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
             events.push({ ...t, date: new Date(t.date) });
        });
    }
    
    // Sort by date, then by type to prioritize disbursements on the same day
    return events.sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        if (a.type === 'disbursement') return -1;
        if (b.type === 'disbursement') return 1;
        return 0;
    });
}


export function performExistingLoanCalculations(data: ExistingLoanFormData): CalculationResult {
    const events = sortAndCombineEvents(data);
    const schedule: Transaction[] = [];

    if (events.length === 0) {
        return {
             outstandingBalance: 0,
            interestPaidToDate: 0,
            nextEmiDate: null,
            originalLoanAmount: 0,
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
    let currentRate = data.interestRate;
    const asOfDate = new Date();

    const firstEventDate = events[0].date;
    const moratoriumEndDate = data.moratoriumPeriod ? add(firstEventDate, { months: data.moratoriumPeriod }) : firstEventDate;
    
    let currentDate = startOfMonth(firstEventDate);
    let eventIndex = 0;

    while (isBefore(currentDate, asOfDate)) {
        // --- 1. Process all events for the current month ---
        let monthInterestAccrued = 0;
        const dailyRate = currentRate / 365.25 / 100;
        
        // Calculate interest on the opening balance of the month
        if (balance > 0) {
            const daysInMonth = differenceInDays(add(currentDate, { months: 1 }), currentDate);
            const interestForMonth = balance * dailyRate * daysInMonth;
            monthInterestAccrued += interestForMonth;
        }

        while (eventIndex < events.length && events[eventIndex].date.getMonth() === currentDate.getMonth() && events[eventIndex].date.getFullYear() === currentDate.getFullYear()) {
            const event = events[eventIndex];

            // Update rate if changed
            if (event.type === 'rate-change') {
                currentRate = event.rate;
                 schedule.push({
                    date: format(event.date, 'yyyy-MM-dd'),
                    type: 'rate-change',
                    amount: 0,
                    principal: 0,
                    interest: 0,
                    endingBalance: balance,
                    note: `Rate changed to ${event.rate}%`
                });
            }
            
            // Add disbursement to balance
            if (event.type === 'disbursement' || event.type === 'withdrawal') {
                balance += event.amount;
                schedule.push({
                    date: format(event.date, 'yyyy-MM-dd'),
                    type: event.type,
                    amount: event.amount,
                    principal: event.amount,
                    interest: 0,
                    endingBalance: balance,
                    note: `Disbursed ${event.amount}`
                });
            }

            // Apply repayments if after moratorium
            if (event.type === 'repayment') {
                if (isSameDay(event.date, moratoriumEndDate) || isBefore(moratoriumEndDate, event.date)) {
                    // Repayment first covers accrued interest
                    const interestToCover = Math.min(event.amount, monthInterestAccrued);
                    const principalToCover = event.amount - interestToCover;
                    
                    balance -= principalToCover;
                    monthInterestAccrued -= interestToCover; // Interest is paid off
                    totalInterestPaid += interestToCover;
                    
                    schedule.push({
                        date: format(event.date, 'yyyy-MM-dd'),
                        type: 'repayment',
                        amount: event.amount,
                        principal: principalToCover,
                        interest: interestToCover,
                        endingBalance: balance,
                        note: `Repayment`
                    });

                }
            }
            eventIndex++;
        }

        // --- 2. Capitalize remaining interest for the month ---
        balance += monthInterestAccrued;
        
        // --- 3. Move to next month ---
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
        if (isBefore(proposedDate, asOfDate)) {
            proposedDate = add(proposedDate, { months: 1 });
        }
        nextEmiDate = proposedDate;
    }

    const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365.25 : 0;

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
