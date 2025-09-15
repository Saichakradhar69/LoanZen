

// src/app/existing-loan/calculations.ts

import { add, differenceInDays, format, setDate } from 'date-fns';
import type { ExistingLoanFormData } from './form';
import type { CalculationResult, Transaction } from './actions';


// --- Credit Line / Irregular Payments (Transactional) ---
function calculateCreditLineBalance(
    events: any[], 
    initialRate: number
): { balance: number; interestPaid: number; schedule: Transaction[], currentRate: number } {
    const schedule: Transaction[] = [];
    let balance = 0;
    let interestPaid = 0;
    let currentRate = initialRate;
    
    if (events.length === 0) {
        return { balance: 0, interestPaid: 0, schedule: [], currentRate };
    }

    let lastEventDate = new Date(events[0].date);

    for (const event of events) {
        const eventDate = new Date(event.date);
        const daysSinceLastEvent = differenceInDays(eventDate, lastEventDate);
        let accruedInterest = 0;

        if (daysSinceLastEvent > 0 && balance > 0) {
             const dailyRate = currentRate / 365.25 / 100;
             accruedInterest = balance * dailyRate * daysSinceLastEvent;
             schedule.push({
                 date: format(eventDate, 'yyyy-MM-dd'),
                 type: 'interest',
                 amount: accruedInterest,
                 principal: 0,
                 interest: parseFloat(accruedInterest.toFixed(2)),
                 endingBalance: parseFloat((balance + accruedInterest).toFixed(2)),
                 note: `Interest accrued for ${daysSinceLastEvent} days @ ${currentRate.toFixed(2)}%`,
             });
        }
       
        let principalComponent = 0;
        let interestComponent = 0;
        
        balance += accruedInterest;

        switch (event.type) {
            case 'disbursement':
            case 'withdrawal':
                balance += event.amount;
                principalComponent = event.amount;
                break;
            case 'repayment':
                const interestPortion = Math.min(event.amount, accruedInterest);
                const principalPortion = event.amount - interestPortion;
                
                balance -= event.amount;
                interestPaid += interestPortion;
                
                interestComponent = interestPortion;
                principalComponent = principalPortion;
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
    const today = new Date();
    const daysSinceLastEvent = differenceInDays(today, lastEventDate);
    if (daysSinceLastEvent > 0 && balance > 0) {
         const dailyRate = currentRate / 365.25 / 100;
         const finalInterest = balance * dailyRate * daysSinceLastEvent;
         balance += finalInterest;
         schedule.push({
            date: format(today, 'yyyy-MM-dd'),
            type: 'interest',
            amount: finalInterest,
            principal: 0,
            interest: parseFloat(finalInterest.toFixed(2)),
            endingBalance: parseFloat(balance.toFixed(2)),
            note: `Interest accrued for ${daysSinceLastEvent} days @ ${currentRate.toFixed(2)}% (to date)`,
        });
    }
    
    return { balance: Math.max(0, balance), interestPaid, schedule, currentRate };
}

function sortAndCombineEvents(data: ExistingLoanFormData): any[] {
    let events: any[] = [];
    
    const disbursementDate = new Date(data.disbursementDate);

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
        data.rateChanges.forEach(rc => {
            events.push({
                date: new Date(rc.date),
                type: 'rate-change',
                rate: rc.rate,
                amount: 0
            });
        });
    }

    const paymentDueDay = data.paymentDueDay || disbursementDate.getDate();

    if ((data.paymentStructure === 'fixed' || ['personal', 'car', 'home', 'education'].includes(data.loanType)) && data.emiAmount && data.emisPaid && data.emisPaid > 0) {
        let firstEmiDate = add(disbursementDate, { months: 1 + (data.moratoriumPeriod || 0) });
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
    } else if (data.paymentStructure === 'variable' && data.transactions) {
         data.transactions.forEach(t => {
            if (t.type === 'repayment') {
                 events.push({ ...t, date: new Date(t.date) });
            }
        });
    }
    
    if ((data.loanType === 'credit-line' || data.loanType === 'custom') && data.transactions) {
        data.transactions.forEach(t => events.push({...t, date: new Date(t.date)}));
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}


export function performExistingLoanCalculations(data: ExistingLoanFormData): CalculationResult {
    let outstandingBalance = 0;
    let interestPaidToDate = 0;
    let schedule: Transaction[] = [];
    let currentRate = data.interestRate;
    let originalLoanAmount = data.originalLoanAmount || 0;
    
    const useTransactionalCalculator = 
        data.loanType === 'credit-line' || 
        data.loanType === 'custom' || 
        (data.disbursements && data.disbursements.length > 0) || 
        (data.rateType === 'floating' && data.rateChanges && data.rateChanges.length > 0) ||
        (data.paymentStructure === 'variable');

    // --- CALCULATION ROUTER ---
    if (useTransactionalCalculator) {
        console.log(`[DEBUG] Using transactional calculator for loan type: ${data.loanType}`);
        const events = sortAndCombineEvents(data);
        const result = calculateCreditLineBalance(events, data.interestRate);
        outstandingBalance = result.balance;
        interestPaidToDate = result.interestPaid;
        schedule = result.schedule;
        currentRate = result.currentRate;

    } else { // Standard loans (personal, car, home, education) with fixed EMIs
        console.log(`[DEBUG] Using fixed EMI calculator for loan type: ${data.loanType}`);
        const result = calculateFixedEmiLoan(data);
        outstandingBalance = result.balance;
        interestPaidToDate = result.interestPaid;
        schedule = result.schedule;
    }
    
    // Final adjustments and metric calculations
    if (data.disbursements && data.disbursements.length > 0) {
        originalLoanAmount = data.disbursements.reduce((sum, d) => sum + d.amount, 0);
    } else if (data.loanType === 'credit-line') {
         const events = sortAndCombineEvents(data);
         originalLoanAmount = events
            .filter(e => e.type === 'withdrawal' || e.type === 'disbursement')
            .reduce((sum, e) => sum + e.amount, 0);
    }
    
    const disbursementDate = new Date(data.disbursementDate);
    const paymentDueDay = data.paymentDueDay || disbursementDate.getDate();

    let firstEmiDate = add(disbursementDate, { months: 1 + (data.moratoriumPeriod || 0) });
    firstEmiDate = setDate(firstEmiDate, paymentDueDay);

    let nextEmiDate = firstEmiDate;
    const today = new Date();
    while(nextEmiDate < today && outstandingBalance > 0) {
        nextEmiDate = add(nextEmiDate, { months: 1 });
    }

    const perDayInterest = outstandingBalance > 0 ? (outstandingBalance * (currentRate / 100)) / 365.25 : 0;

    return {
        outstandingBalance,
        interestPaidToDate,
        nextEmiDate: outstandingBalance > 0 ? nextEmiDate.toISOString() : null,
        originalLoanAmount: originalLoanAmount,
        loanName: data.loanName,
        loanType: data.loanType,
        interestType: data.interestType,
        interestRate: currentRate,
        perDayInterest: perDayInterest,
        schedule,
        emiAmount: data.emiAmount,
    };
}


function calculateFixedEmiLoan(
    data: ExistingLoanFormData
): { balance: number; interestPaid: number; schedule: Transaction[] } {
    const schedule: Transaction[] = [];
    let balance = data.originalLoanAmount || 0;
    let interestPaid = 0;
    const monthlyRate = data.interestRate / 12 / 100;
    const emi = data.emiAmount || 0;
    const emisPaid = data.emisPaid || 0;

    const disbursementDate = new Date(data.disbursementDate);

    schedule.push({
        date: format(disbursementDate, 'yyyy-MM-dd'),
        type: 'disbursement',
        amount: balance,
        principal: balance,
        interest: 0,
        endingBalance: balance,
        note: 'Initial loan amount'
    });
    
    let lastDate = disbursementDate;

    if (data.moratoriumPeriod && data.moratoriumPeriod > 0) {
        let moratoriumEndDate = add(disbursementDate, { months: data.moratoriumPeriod });
        const daysInMoratorium = differenceInDays(moratoriumEndDate, disbursementDate);
        const dailyRate = data.interestRate / 365.25 / 100;
        const interestAccrued = balance * dailyRate * daysInMoratorium;
        balance += interestAccrued;
        schedule.push({
            date: format(moratoriumEndDate, 'yyyy-MM-dd'),
            type: 'interest',
            amount: interestAccrued,
            principal: 0,
            interest: interestAccrued,
            endingBalance: balance,
            note: `Interest capitalized after ${data.moratoriumPeriod}-month moratorium`
        });
        lastDate = moratoriumEndDate;
    }
    
    if (emi <= 0 || emisPaid <= 0) {
        // If no payments made, just accrue interest till today and return.
        const daysSinceLastEvent = differenceInDays(new Date(), lastDate);
         if (daysSinceLastEvent > 0) {
            const dailyRate = data.interestRate / 365.25 / 100;
            const accruedInterest = balance * dailyRate * daysSinceLastEvent;
            balance += accruedInterest;
            schedule.push({
                date: format(new Date(), 'yyyy-MM-dd'),
                type: 'interest',
                amount: accruedInterest,
                principal: 0,
                interest: accruedInterest,
                endingBalance: balance,
                note: `Interest accrued for ${daysSinceLastEvent} days`
            });
         }
        return { balance, interestPaid, schedule };
    }

    let firstEmiDate = add(disbursementDate, { months: 1 + (data.moratoriumPeriod || 0) });
    firstEmiDate = setDate(firstEmiDate, data.paymentDueDay || 1);

    for (let i = 1; i <= emisPaid; i++) {
        const paymentDate = add(firstEmiDate, { months: i - 1});
        if (paymentDate > new Date()) break;

        const interestComponent = balance * monthlyRate;
        const principalComponent = emi - interestComponent;
        
        balance -= principalComponent;
        interestPaid += interestComponent;

        schedule.push({
            date: format(paymentDate, 'yyyy-MM-dd'),
            type: 'repayment',
            amount: emi,
            principal: principalComponent,
            interest: interestComponent,
            endingBalance: balance,
            note: `EMI #${i}`
        });
    }

    return { balance: Math.max(0, balance), interestPaid, schedule };
}
