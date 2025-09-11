
// src/app/existing-loan/calculations.ts

import { add, differenceInDays, format } from 'date-fns';
import type { ExistingLoanFormData } from './form';
import type { CalculationResult, Transaction } from './actions';

function sortAndCombineEvents(data: ExistingLoanFormData): any[] {
    let events: any[] = [];

    // Initial Disbursement
    events.push({
        date: data.disbursementDate,
        type: 'disbursement',
        amount: data.originalLoanAmount,
    });

    // Additional Disbursements
    if (data.disbursements && data.disbursements.length > 0) {
        data.disbursements.forEach(d => {
            events.push({
                date: d.date,
                type: 'disbursement',
                amount: d.amount
            });
        });
    }


    // Rate Changes
    if (data.rateChanges) {
        data.rateChanges.forEach(rc => {
            events.push({
                date: rc.date,
                type: 'rate-change',
                rate: rc.rate,
            });
        });
    }

    // Repayments
    if (data.paymentStructure === 'fixed' && data.emiAmount && data.emisPaid) {
        let firstEmiDate = add(data.disbursementDate, { months: 1 + (data.moratoriumPeriod || 0) });
        for (let i = 0; i < data.emisPaid; i++) {
            events.push({
                date: add(firstEmiDate, { months: i }),
                type: 'repayment',
                amount: data.emiAmount,
            });
        }
    } else if (data.paymentStructure === 'variable' && data.transactions) {
         data.transactions.forEach(t => {
            if (t.type === 'repayment') {
                 events.push({ ...t });
            }
        });
    }
    
    // Credit Line transactions
    if (data.loanType === 'credit-line' && data.transactions) {
        data.transactions.forEach(t => events.push({...t}));
    }


    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}


export function performExistingLoanCalculations(data: ExistingLoanFormData): CalculationResult {
    // This is a complex logic that requires day-by-day calculation.
    // The implementation below is a SIMPLIFIED version for demonstration.
    // A production-ready version would require a more robust, battle-tested financial library.

    const events = sortAndCombineEvents(data);
    const schedule: Transaction[] = [];

    let balance = 0;
    let interestPaid = 0;
    let currentRate = data.interestRate;
    let lastEventDate = events.length > 0 ? events[0].date : new Date();

    if (data.interestType === 'flat') {
        // Simplified Flat Rate Logic
        let totalPrincipal = data.originalLoanAmount;
        if(data.disbursements && data.disbursements.length > 0) {
            totalPrincipal = data.disbursements.reduce((acc, d) => acc + d.amount, 0);
        }

        let totalRepayments = 0;
        
        events.forEach(e => {
            if (e.type === 'repayment') totalRepayments += e.amount;
        });
        
        const daysElapsed = differenceInDays(new Date(), data.disbursementDate);
        const yearsElapsed = daysElapsed / 365.25;

        const totalInterestAccrued = data.originalLoanAmount * (data.interestRate / 100) * yearsElapsed;
        
        balance = totalPrincipal + totalInterestAccrued - totalRepayments;
        interestPaid = Math.max(0, totalRepayments - totalPrincipal);

    } else {
        // Reducing Balance Logic
        for (const event of events) {
            const eventDate = new Date(event.date);
            const daysSinceLastEvent = differenceInDays(eventDate, lastEventDate);
            let accruedInterest = 0;
            if (daysSinceLastEvent > 0 && balance > 0) {
                 accruedInterest = (balance * (currentRate / 100) * daysSinceLastEvent) / 365.25;
            }
           
            if (accruedInterest > 0) {
                 balance += accruedInterest;
                 schedule.push({
                     date: format(eventDate, 'yyyy-MM-dd'),
                     type: 'interest',
                     amount: accruedInterest,
                     principal: 0,
                     interest: parseFloat(accruedInterest.toFixed(2)),
                     endingBalance: parseFloat(balance.toFixed(2)),
                     note: `Interest accrued for ${daysSinceLastEvent} days @ ${currentRate}%`,
                 });
            }

            let principalComponent = 0;
            let interestComponent = 0;
            
            switch (event.type) {
                case 'disbursement':
                case 'withdrawal':
                    balance += event.amount;
                    principalComponent = event.amount;
                    break;
                case 'repayment':
                    let interestPortion = Math.min(event.amount, accruedInterest > 0 ? accruedInterest : 0);
                    interestPaid += interestPortion;
                    const principalPortion = event.amount - interestPortion;
                    balance -= event.amount;
                    interestComponent = interestPortion;
                    principalComponent = -principalPortion;
                    break;
                case 'rate-change':
                    currentRate = event.rate;
                    break;
            }

             schedule.push({
                date: format(eventDate, 'yyyy-MM-dd'),
                type: event.type,
                amount: event.amount,
                principal: parseFloat(principalComponent.toFixed(2)),
                interest: parseFloat(interestComponent.toFixed(2)),
                endingBalance: parseFloat(balance.toFixed(2)),
                note: event.type === 'rate-change' ? `Rate changed to ${event.rate}%` : undefined
            });

            lastEventDate = eventDate;
        }

        // Accrue interest from last event to today
        const daysSinceLastEvent = differenceInDays(new Date(), lastEventDate);
        if (daysSinceLastEvent > 0 && balance > 0) {
             const finalInterest = (balance * (currentRate / 100) * daysSinceLastEvent) / 365.25;
             balance += finalInterest;
        }
    }
    
    let firstEmiDate = add(new Date(data.disbursementDate), { months: 1 + (data.moratoriumPeriod || 0) });
    let nextEmiDate = firstEmiDate;
    const today = new Date();
    while(nextEmiDate < today) {
        nextEmiDate = add(nextEmiDate, { months: 1 });
    }

    return {
        outstandingBalance: Math.max(0, balance),
        interestPaidToDate: interestPaid,
        nextEmiDate: nextEmiDate.toISOString(),
        originalLoanAmount: data.disbursements && data.disbursements.length > 0 ? data.disbursements.reduce((acc,d) => acc + d.amount, data.originalLoanAmount) : data.originalLoanAmount,
        loanName: data.loanName,
        loanType: data.loanType,
        interestType: data.interestType,
        interestRate: currentRate,
        schedule,
    };
}
