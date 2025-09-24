// src/app/existing-loan/loan-calculations/standard-loan.ts

import { add, differenceInDays, format, isBefore, isAfter, setDate, isSameDay, startOfMonth } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

// This function now uses the same robust, event-based logic as the education loan calculator.
export function calculateStandardLoan(data: ExistingLoanFormData): CalculationResult {
    const {
        disbursementDate,
        interestRate,
        loanName,
        loanType,
        interestType,
        emiAmount = 0,
        emisPaid = 0,
        missedEmis = 0,
        paymentDueDay = 1,
        rateChanges = []
    } = data;

    if (!disbursementDate) {
        throw new Error("Missing required disbursement date.");
    }
    
    // --- Phase 1: Build Event Timeline ---
    const asOfDate = new Date();
    const schedule: Transaction[] = [];

    // Combine all disbursements into a sorted list
    let disbursements = [...(data.disbursements || [])];
    if (data.originalLoanAmount && data.originalLoanAmount > 0 && disbursements.length === 0) {
        disbursements.push({ date: new Date(disbursementDate), amount: data.originalLoanAmount });
    }
    disbursements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (disbursements.length === 0) {
        throw new Error("No disbursement amount provided.");
    }

    const firstDisbursementDate = new Date(disbursements[0].date);
    // Standard loans have no moratorium, so repayment starts from the next month.
    const firstEmiDate = setDate(add(firstDisbursementDate, { months: 1 }), paymentDueDay);
    
    const sortedRateChanges = [...rateChanges].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // --- Phase 2: Monthly Iterative Calculation ---
    let balance = 0;
    let totalInterestPaid = 0;
    let currentRate = interestRate;
    
    let currentDate = startOfMonth(firstDisbursementDate);
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);


    // Initial Disbursement(s) on or before the first month starts
    let lastProcessedDisbursementIndex = -1;
    disbursements.forEach((d, index) => {
        const disbursementDay = new Date(d.date);
        if (isBefore(disbursementDay, currentDate) || isSameDay(disbursementDay, currentDate)) {
            balance += d.amount;
            schedule.push({
                date: format(disbursementDay, 'yyyy-MM-dd'),
                type: 'disbursement',
                amount: d.amount,
                principal: d.amount,
                interest: 0,
                endingBalance: balance,
                note: `Disbursement`
            });
            lastProcessedDisbursementIndex = index;
        }
    });

    while (isBefore(currentDate, asOfDate)) {
        const monthStartDate = currentDate;
        const nextMonthStartDate = add(monthStartDate, { months: 1 });
        
        // Find the applicable interest rate for this month
        const rateChangeEvent = [...sortedRateChanges].reverse().find(rc => isBefore(new Date(rc.date), nextMonthStartDate) || isSameDay(new Date(rc.date), nextMonthStartDate));
        if (rateChangeEvent) {
             currentRate = rateChangeEvent.rate;
        }

        const monthlyInterestRate = currentRate / 100 / 12;

        // Process any disbursements within this month
        disbursements.forEach((d, index) => {
            const disbursementDay = new Date(d.date);
            if (index > lastProcessedDisbursementIndex && isBefore(disbursementDay, nextMonthStartDate) && isAfter(disbursementDay, monthStartDate)) {
                 balance += d.amount;
                 schedule.push({
                    date: format(disbursementDay, 'yyyy-MM-dd'),
                    type: 'disbursement', amount: d.amount, principal: d.amount,
                    interest: 0, endingBalance: balance, note: `Disbursement`
                });
                lastProcessedDisbursementIndex = index;
            }
        });
        
        const interestForMonth = balance * monthlyInterestRate;
        
        // --- Repayment Logic ---
        const paidEmisCount = schedule.filter(s => s.note?.startsWith('EMI #')).length;
        const missedEmisCountInSchedule = schedule.filter(s => s.note?.includes('(Missed)')).length;
        const currentEmiIndex = paidEmisCount + missedEmisCountInSchedule;
        
        if (isAfter(monthStartDate, firstDisbursementDate) && currentEmiIndex < emisPaid) {
            const isMissed = currentEmiIndex >= (emisPaid - missedEmis);
            
            const paymentForMonth = isMissed ? 0 : emiAmount;
            const note = isMissed ? `EMI #${currentEmiIndex + 1} (Missed)` : `EMI #${currentEmiIndex + 1}`;
            
            const interestComponent = interestForMonth;
            const principalComponent = paymentForMonth - interestComponent;
            
            // If payment doesn't cover interest, balance increases (negative amortization)
             if (principalComponent < 0) {
                 balance += Math.abs(principalComponent);
             } else {
                 balance -= principalComponent;
             }
            
            totalInterestPaid += Math.min(paymentForMonth, interestComponent);
            
             const emiDate = setDate(monthStartDate, paymentDueDay);
             if (isBefore(emiDate, asOfDate)) {
                 schedule.push({
                    date: format(emiDate, 'yyyy-MM-dd'),
                    type: isMissed ? 'interest' : 'repayment', 
                    amount: isMissed ? interestForMonth : paymentForMonth, 
                    principal: isMissed ? 0 : principalComponent, 
                    interest: interestComponent, 
                    endingBalance: balance, 
                    note
                });
             }

        } else {
            // If it's not an EMI month yet (e.g., the very first month of disbursement), just accrue interest.
            balance += interestForMonth;
            schedule.push({
                date: format(monthStartDate, 'yyyy-MM-dd'),
                type: 'interest',
                amount: interestForMonth,
                principal: 0,
                interest: interestForMonth,
                endingBalance: balance,
                note: 'Interest Accrued'
            });
        }
        
        currentDate = nextMonthStartDate;
    }
    
    // Final interest accrual from the start of the current month to as-of date
    const lastCalcDate = startOfMonth(asOfDate);
    const daysSinceLastCalc = differenceInDays(asOfDate, lastCalcDate);

    if (daysSinceLastCalc > 0 && balance > 0) {
        const finalInterest = balance * (currentRate / 100 / 365.25) * daysSinceLastCalc;
        balance += finalInterest;
         schedule.push({
            date: format(asOfDate, 'yyyy-MM-dd'),
            type: 'interest',
            amount: finalInterest,
            principal: 0,
            interest: finalInterest,
            endingBalance: balance,
            note: 'Interest accrued until today'
        });
    }

    // --- Phase 3: Calculate Next EMI ---
    let nextEmiDate: Date | null = null;
    if (balance > 0 && emiAmount > 0) {
       const lastEmiIndex = emisPaid - 1;
       const lastEmiDate = add(firstEmiDate, {months: lastEmiIndex});
       
       let proposedDate = add(lastEmiDate, {months: 1});
       
       if (isBefore(proposedDate, asOfDate) || isSameDay(proposedDate, asOfDate)) {
           proposedDate = setDate(asOfDate, paymentDueDay);
           if(isBefore(proposedDate, asOfDate) || isSameDay(proposedDate, asOfDate)) {
               proposedDate = add(proposedDate, {months: 1});
           }
       }
       nextEmiDate = proposedDate;
    }
    
    const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365.25 : 0;

    const originalLoanAmount = disbursements.reduce((acc, d) => acc + d.amount, 0);

     // --- Project remaining interest ---
    let futureBalance = balance;
    let remainingInterest = 0;
    let projectionDate = asOfDate;
    
    if (futureBalance > 0 && emiAmount > 0) {
        while (futureBalance > 0) {
            const monthlyInterestRate = currentRate / 100 / 12;
            const interestPortion = futureBalance * monthlyInterestRate;

            if (emiAmount <= interestPortion) {
                remainingInterest = Infinity; // Loan will never be paid off
                break;
            }

            remainingInterest += interestPortion;
            const principalPortion = emiAmount - interestPortion;
            futureBalance -= principalPortion;

            projectionDate = add(projectionDate, { months: 1 });
            if (differenceInDays(projectionDate, asOfDate) > 365 * 40) { // 40 year safety break
                remainingInterest = Infinity;
                break;
            }
        }
    }

    return {
        outstandingBalance: balance,
        interestPaidToDate: totalInterestPaid,
        nextEmiDate: nextEmiDate ? nextEmiDate.toISOString() : null,
        originalLoanAmount,
        loanName,
        loanType,
        interestType,
        interestRate: currentRate,
        perDayInterest,
        schedule,
        emiAmount,
        projectedTotalInterest: totalInterestPaid + (isFinite(remainingInterest) ? remainingInterest : 0)
    };
}
