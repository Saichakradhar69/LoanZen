

// src/app/existing-loan/calculations.ts

import { add, differenceInDays, format } from 'date-fns';
import type { ExistingLoanFormData } from './form';
import type { CalculationResult, Transaction } from './actions';

// --- Standard Fixed-Rate Loan (Reducing Balance) ---
function calculateStandardFixedLoan(
    principal: number,
    annualRate: number,
    tenureMonths: number,
    paymentsMade: number
): { outstandingBalance: number, emi: number } {
    if (tenureMonths <= 0) return { outstandingBalance: principal, emi: 0 };
    
    const R = annualRate / 12 / 100; // Monthly interest rate
    const P = principal;
    const N = tenureMonths;
    const k = paymentsMade;

    if (R === 0) {
        const emi = P / N;
        const outstandingBalance = P - (emi * k);
        return { outstandingBalance, emi };
    }

    const emi = P * R * Math.pow(1 + R, N) / (Math.pow(1 + R, N) - 1);
    
    if (k >= N) {
        return { outstandingBalance: 0, emi: emi };
    }

    const outstandingBalance = P * (Math.pow(1 + R, N) - Math.pow(1 + R, k)) / (Math.pow(1 + R, N) - 1);
    
    return { outstandingBalance: Math.max(0, outstandingBalance), emi };
}


// --- Flat Rate Loan ---
function calculateFlatRateLoan(
    principal: number,
    annualRate: number,
    tenureMonths: number,
    paymentsMade: number
): { outstandingBalance: number, emi: number } {
    if (tenureMonths <= 0) return { outstandingBalance: principal, emi: 0 };
    const N = tenureMonths;
    const k = paymentsMade;
    
    const totalInterest = principal * (annualRate / 100) * (N / 12);
    const totalRepayable = principal + totalInterest;
    const emi = totalRepayable / N;
    
    const outstandingBalance = totalRepayable - (emi * k);

    return { outstandingBalance: Math.max(0, outstandingBalance), emi };
}

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
    
    // Initial Disbursement is the first event, if not using multi-disbursement
    if (data.originalLoanAmount && data.originalLoanAmount > 0 && (!data.disbursements || data.disbursements.length === 0)) {
        events.push({
            date: new Date(data.disbursementDate),
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
    if (data.paymentStructure === 'fixed' && data.emiAmount && data.emisPaid && data.emisPaid > 0) {
        let firstEmiDate = add(new Date(data.disbursementDate), { months: 1 + (data.moratoriumPeriod || 0) });
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
    } else if (data.loanType !== 'credit-line' && data.emiAmount && data.emisPaid && data.emisPaid > 0) {
        // This is the fallback for loan types like personal, car, home, and now education.
        let firstEmiDate = add(new Date(data.disbursementDate), { months: 1 + (data.moratoriumPeriod || 0) });
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

    // Transactional calculation is more accurate for all complex cases
    const result = calculateCreditLineBalance(events, data.interestRate);
    outstandingBalance = result.balance;
    interestPaidToDate = result.interestPaid;
    schedule = result.schedule;
    currentRate = result.currentRate;
    
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
    
    let firstEmiDate = add(new Date(data.disbursementDate), { months: 1 + (data.moratoriumPeriod || 0) });
    let nextEmiDate = firstEmiDate;
    const today = new Date();
    while(nextEmiDate < today && outstandingBalance > 0) {
        nextEmiDate = add(nextEmiDate, { months: 1 });
    }

    return {
        outstandingBalance: Math.max(0, outstandingBalance),
        interestPaidToDate: interestPaidToDate,
        nextEmiDate: outstandingBalance > 0 ? nextEmiDate.toISOString() : null,
        originalLoanAmount: originalLoanAmount,
        loanName: data.loanName,
        loanType: data.loanType,
        interestType: data.interestType,
        interestRate: currentRate,
        schedule,
    };
}
