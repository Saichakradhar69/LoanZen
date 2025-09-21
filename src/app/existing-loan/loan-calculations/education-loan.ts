// src/app/existing-loan/loan-calculations/education-loan.ts

import { add, differenceInDays, format, isBefore, isAfter, setDate, isSameDay, startOfMonth, getDaysInMonth } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

export function calculateEducationLoan(data: ExistingLoanFormData): CalculationResult {
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
        moratoriumPeriod = 0,
        moratoriumInterestType = 'none',
        moratoriumPaymentAmount = 0,
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
    const moratoriumEndDate = add(firstDisbursementDate, { months: moratoriumPeriod });
    const firstEmiDate = setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay);
    
    const sortedRateChanges = [...rateChanges].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // --- Phase 2: Monthly Iterative Calculation ---
    let balance = 0;
    let totalInterestPaid = 0;
    let currentRate = interestRate;
    
    let currentDate = startOfMonth(firstDisbursementDate);

    // Initial Disbursement(s) on or before the first month starts
    let lastProcessedDisbursementIndex = -1;
    disbursements.forEach((d, index) => {
        if (isBefore(new Date(d.date), currentDate) || isSameDay(new Date(d.date), currentDate)) {
            balance += d.amount;
            schedule.push({
                date: format(new Date(d.date), 'yyyy-MM-dd'),
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
            if (index > lastProcessedDisbursementIndex && isBefore(new Date(d.date), nextMonthStartDate)) {
                 balance += d.amount;
                 schedule.push({
                    date: format(new Date(d.date), 'yyyy-MM-dd'),
                    type: 'disbursement', amount: d.amount, principal: d.amount,
                    interest: 0, endingBalance: balance, note: `Disbursement`
                });
                lastProcessedDisbursementIndex = index;
            }
        });
        
        const interestForMonth = balance * monthlyInterestRate;
        let paymentForMonth = 0;
        let interestComponent = 0;
        let principalComponent = 0;
        let note = '';

        const isMoratoriumMonth = isBefore(monthStartDate, moratoriumEndDate);

        if (isMoratoriumMonth) {
            note = `Moratorium Period`;
            switch (moratoriumInterestType) {
                case 'simple':
                    paymentForMonth = interestForMonth;
                    interestComponent = interestForMonth;
                    principalComponent = 0;
                    note += ' (Simple Interest Paid)';
                    break;
                case 'partial':
                    paymentForMonth = moratoriumPaymentAmount; // This is a percentage in the form
                    const partialInterestPayment = interestForMonth * (moratoriumPaymentAmount / 100);
                    paymentForMonth = partialInterestPayment;
                    interestComponent = partialInterestPayment;
                    principalComponent = 0; // No principal payment during moratorium
                    balance += (interestForMonth - partialInterestPayment); // Capitalize unpaid interest
                    note += ` (Partial Interest Paid)`;
                    break;
                case 'fixed':
                    paymentForMonth = moratoriumPaymentAmount;
                    interestComponent = Math.min(interestForMonth, paymentForMonth);
                    principalComponent = 0;
                    balance += (interestForMonth - interestComponent); // Capitalize unpaid
                    note += ` (Fixed Min. Payment)`;
                    break;
                case 'none':
                default:
                    paymentForMonth = 0;
                    interestComponent = 0;
                    principalComponent = 0;
                    balance += interestForMonth; // Capitalize full interest
                    note += ' (Interest Capitalized)';
                    break;
            }
             schedule.push({
                date: format(monthStartDate, 'yyyy-MM-dd'),
                type: 'interest', amount: interestForMonth, principal: 0, interest: interestForMonth, endingBalance: balance, note
            });
             totalInterestPaid += interestComponent;

        } else { // Repayment Period
            // Find if an EMI was scheduled for this month
            const paidEmisCount = schedule.filter(s => s.note?.startsWith('EMI #')).length;
            const missedEmisCount = schedule.filter(s => s.note?.includes('(Missed)')).length;

            const currentEmiIndex = paidEmisCount + missedEmisCount;
            
            if (currentEmiIndex < emisPaid) {
                const isMissed = currentEmiIndex >= (emisPaid - missedEmis);
                
                paymentForMonth = isMissed ? 0 : emiAmount;
                note = isMissed ? `EMI #${currentEmiIndex + 1} (Missed)` : `EMI #${currentEmiIndex + 1}`;
                
                interestComponent = interestForMonth;
                principalComponent = paymentForMonth - interestComponent;
                balance += principalComponent < 0 ? Math.abs(principalComponent) : 0; // Capitalize if payment < interest
                balance -= paymentForMonth > interestForMonth ? principalComponent : 0;
                
                totalInterestPaid += interestComponent;
                
                schedule.push({
                    date: format(setDate(monthStartDate, paymentDueDay), 'yyyy-MM-dd'),
                    type: isMissed ? 'interest' : 'repayment',
                    amount: paymentForMonth,
                    principal: Math.max(0, principalComponent),
                    interest: interestComponent,
                    endingBalance: balance,
                    note
                });
            }
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

    const originalLoanAmount = (data.originalLoanAmount || 0) + (data.disbursements || []).reduce((acc, d) => acc + d.amount, 0);

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
    };
}
