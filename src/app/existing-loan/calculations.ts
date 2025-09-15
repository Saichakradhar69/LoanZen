

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
             // Don't add to balance yet, it's just calculated for payment breakdown
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
        
        // Capitalize any outstanding interest before applying the new event
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
    
    return { balance, interestPaid, schedule, currentRate };
}


function sortAndCombineEvents(data: ExistingLoanFormData): any[] {
    let events: any[] = [];
    
    const disbursementDate = new Date(data.disbursementDate);

    // Initial Disbursement is the first event, if not using multi-disbursement
    if (data.originalLoanAmount && data.originalLoanAmount > 0 && (!data.disbursements || data.disbursements.length === 0)) {
        events.push({
            date: disbursementDate,
            type: 'disbursement',
            amount: data.originalLoanAmount,
        });
    }

    // Additional Disbursements for education loans or custom loans
    if (data.disbursements && data.disbursements.length > 0) {
        data.disbursements.forEach(d => {
            events.push({
                date: new Date(d.date),
                type: 'disbursement',
                amount: d.amount
            });
        });
    }

    // Rate Changes for floating rate loans
    if (data.rateType === 'floating' && data.rateChanges) {
        data.rateChanges.forEach(rc => {
            events.push({
                date: new Date(rc.date),
                type: 'rate-change',
                rate: rc.rate,
                amount: 0 // rate changes don't have an amount
            });
        });
    }

    // Repayments (EMIs or variable)
    const paymentDueDay = data.paymentDueDay || disbursementDate.getDate();

    if (data.paymentStructure === 'fixed' && data.emiAmount && data.emisPaid && data.emisPaid > 0) {
        let firstEmiDate = add(disbursementDate, { months: 1 + (data.moratoriumPeriod || 0) });
        firstEmiDate = setDate(firstEmiDate, paymentDueDay);
        
        for (let i = 0; i < data.emisPaid; i++) {
            const paymentDate = add(firstEmiDate, { months: i });
            // Don't add payments that are in the future
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
    } else if (['personal', 'car', 'home', 'education'].includes(data.loanType) && data.emiAmount && data.emisPaid && data.emisPaid > 0) {
         let firstEmiDate = add(disbursementDate, { months: 1 + (data.moratoriumPeriod || 0) });
         firstEmiDate = setDate(firstEmiDate, paymentDueDay);

        for (let i = 0; i < data.emisPaid; i++) {
            const paymentDate = add(firstEmiDate, { months: i });
            // Don't add payments that are in the future
            if (paymentDate <= new Date()) {
                events.push({
                    date: paymentDate,
                    type: 'repayment',
                    amount: data.emiAmount,
                });
            }
        }
    }
    
    // Credit Line specific transactions
    if (data.loanType === 'credit-line' && data.transactions) {
        data.transactions.forEach(t => events.push({...t, date: new Date(t.date)}));
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}


export function performExistingLoanCalculations(data: ExistingLoanFormData): CalculationResult {
    const events = sortAndCombineEvents(data);
    
    let outstandingBalance = 0;
    let interestPaidToDate = 0;
    let schedule: Transaction[] = [];
    let currentRate = data.interestRate;
    let originalLoanAmount = data.originalLoanAmount || 0;

    // --- Calculation Router ---
    // Use the more complex transactional calculation for loans that require it.
    // Otherwise, use the simpler fixed EMI calculation for standard loans.
    // This is the core of the refactor to handle different loan types correctly.
    if (data.loanType === 'credit-line' || data.loanType === 'custom' || (data.disbursements && data.disbursements.length > 0) || (data.rateChanges && data.rateChanges.length > 0)) {
        const result = calculateCreditLineBalance(events, data.interestRate);
        outstandingBalance = result.balance;
        interestPaidToDate = result.interestPaid;
        schedule = result.schedule;
        currentRate = result.currentRate;
    } else {
        // Fallback to simpler fixed EMI calculation for standard loans
        const result = calculateFixedEmiLoan(data);
        outstandingBalance = result.balance;
        interestPaidToDate = result.interestPaid;
        schedule = result.schedule;
    }

    
    // Recalculate original loan amount from disbursements if they exist
    if (data.disbursements && data.disbursements.length > 0) {
        originalLoanAmount = data.disbursements.reduce((sum, d) => sum + d.amount, 0);
    } else if (data.loanType === 'credit-line') {
         originalLoanAmount = events
            .filter(e => e.type === 'withdrawal' || e.type === 'disbursement')
            .reduce((sum, e) => sum + e.amount, 0);
    }

    // Handle Moratorium Period interest capitalization for display if not done transactionally
     if (data.loanType === 'education' && data.moratoriumPeriod && data.moratoriumPeriod > 0) {
        const principal = data.originalLoanAmount || 0;
        const R = data.interestRate / 12 / 100;
        const M = data.moratoriumPeriod;
        const accruedInterest = principal * R * M;
        if (!data.disbursements || data.disbursements.length === 0) {
             originalLoanAmount = principal + accruedInterest; // Show capitalized amount as original
        }
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
        outstandingBalance: Math.max(0, outstandingBalance),
        interestPaidToDate: interestPaidToDate,
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


// --- Standard Fixed EMI Loan Calculator ---
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
    
    if (emi <= 0 || emisPaid <= 0) {
        // If no payments, just accrue interest to today
        const daysSinceDisbursement = differenceInDays(new Date(), disbursementDate);
        const dailyRate = data.interestRate / 365.25 / 100;
        const accruedInterest = balance * dailyRate * daysSinceDisbursement;
        balance += accruedInterest;
        interestPaid = 0; // No repayments made
         schedule.push({
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'interest',
            amount: accruedInterest,
            principal: 0,
            interest: accruedInterest,
            endingBalance: balance,
            note: `Interest accrued for ${daysSinceDisbursement} days`
        });
        return { balance, interestPaid, schedule };
    }

    let paymentDate = add(disbursementDate, { months: 1 + (data.moratoriumPeriod || 0) });
    paymentDate = setDate(paymentDate, data.paymentDueDay || 1);

    for (let i = 1; i <= emisPaid; i++) {
        if (paymentDate > new Date()) break; // Don't project future payments that user said were paid

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

        paymentDate = add(paymentDate, { months: 1 });
    }

    return { balance: Math.max(0, balance), interestPaid, schedule };
}
