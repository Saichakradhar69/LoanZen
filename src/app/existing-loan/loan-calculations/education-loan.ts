// src/app/existing-loan/loan-calculations/education-loan.ts

import { add, differenceInDays, format, isBefore, isAfter, setDate, isSameDay } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

export function calculateEducationLoan(data: ExistingLoanFormData): CalculationResult {
    const {
        originalLoanAmount = 0,
        disbursementDate,
        interestRate = 0,
        emiAmount = 0,
        emisPaid = 0,
        missedEmis = 0,
        paymentDueDay = 1,
        loanName = 'Education Loan',
        loanType = 'education',
        interestType = 'reducing',
        moratoriumPeriod = 0,
        moratoriumInterestType = 'none',
        moratoriumPaymentAmount = 0,
    } = data;

    if (!disbursementDate) {
        throw new Error("Missing required disbursement date.");
    }
    
    // --- Phase 1: Calculate Principal at the end of Moratorium ---
    const monthlyInterestRate = interestRate / 100 / 12;
    const firstDisbursementDate = new Date(disbursementDate);
    const moratoriumEndDate = add(firstDisbursementDate, { months: moratoriumPeriod });

    let principalAtRepaymentStart = originalLoanAmount;
    let interestPaidDuringMoratorium = 0;

    if (moratoriumPeriod > 0) {
        if (moratoriumInterestType === 'none') { // Case A: Capitalization
            // P_cap = P₀ * (1 + i)^m
            principalAtRepaymentStart = originalLoanAmount * Math.pow(1 + monthlyInterestRate, moratoriumPeriod);
        } else if (moratoriumInterestType === 'simple') { // Case B: Simple Interest
            // Principal does not change, but we calculate interest paid
            interestPaidDuringMoratorium = originalLoanAmount * monthlyInterestRate * moratoriumPeriod;
            principalAtRepaymentStart = originalLoanAmount;
        } else if (moratoriumInterestType === 'partial') { // Case C: Partial Interest
            let currentBalance = originalLoanAmount;
            for (let m = 0; m < moratoriumPeriod; m++) {
                const interestThisMonth = currentBalance * monthlyInterestRate;
                const unpaidInterest = interestThisMonth - moratoriumPaymentAmount;
                currentBalance += Math.max(0, unpaidInterest); // Add only if payment doesn't cover interest
                interestPaidDuringMoratorium += Math.min(interestThisMonth, moratoriumPaymentAmount);
            }
            principalAtRepaymentStart = currentBalance;
        }
    }


    // --- Phase 2: Calculate Outstanding Balance after EMIs ---
    const k = emisPaid - missedEmis; // Number of actual payments made
    let outstandingBalance = principalAtRepaymentStart;
    let totalInterestPaidInRepayment = 0;
    
    // Generate a theoretical schedule for paid EMIs
    const schedule: Transaction[] = [];

    // Initial disbursement(s)
    schedule.push({
        date: format(firstDisbursementDate, 'yyyy-MM-dd'),
        type: 'disbursement',
        amount: originalLoanAmount,
        principal: originalLoanAmount,
        interest: 0,
        endingBalance: originalLoanAmount,
        note: 'Loan Disbursed'
    });
    
    if (principalAtRepaymentStart !== originalLoanAmount && moratoriumPeriod > 0) {
         schedule.push({
            date: format(moratoriumEndDate, 'yyyy-MM-dd'),
            type: 'interest',
            amount: principalAtRepaymentStart - originalLoanAmount,
            principal: 0,
            interest: principalAtRepaymentStart - originalLoanAmount,
            endingBalance: principalAtRepaymentStart,
            note: 'Interest Capitalized'
        });
    }

    let lastPaymentDate = moratoriumEndDate;

    if (k > 0) {
        // Outstanding_k = P * (1+i)^k - EMI * [((1+i)^k - 1) / i]
        const powerTerm = Math.pow(1 + monthlyInterestRate, k);
        outstandingBalance = principalAtRepaymentStart * powerTerm - emiAmount * ((powerTerm - 1) / monthlyInterestRate);
        
        // To calculate interest paid, we simulate the paid EMIs
        let tempBalance = principalAtRepaymentStart;
        for (let i = 0; i < k; i++) {
            const interestComponent = tempBalance * monthlyInterestRate;
            const principalComponent = emiAmount - interestComponent;
            tempBalance -= principalComponent;
            totalInterestPaidInRepayment += interestComponent;

            const paymentDate = add(setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay), { months: i });
            schedule.push({
                date: format(paymentDate, 'yyyy-MM-dd'),
                type: 'repayment',
                amount: emiAmount,
                principal: principalComponent,
                interest: interestComponent,
                endingBalance: tempBalance,
                note: `EMI #${i + 1}`
            });
            lastPaymentDate = paymentDate;
        }
    }
    
    // --- Phase 3: Accrue interest from last EMI date to today ---
    const asOfDate = new Date();
    if (isBefore(lastPaymentDate, asOfDate)) {
        const daysSinceLastPayment = differenceInDays(asOfDate, lastPaymentDate);
        if (daysSinceLastPayment > 0 && outstandingBalance > 0) {
            const finalInterest = outstandingBalance * (interestRate / 100 / 365.25) * daysSinceLastPayment;
            outstandingBalance += finalInterest;
             schedule.push({
                date: format(asOfDate, 'yyyy-MM-dd'),
                type: 'interest',
                amount: finalInterest,
                principal: 0,
                interest: finalInterest,
                endingBalance: outstandingBalance,
                note: 'Interest accrued to date'
            });
        }
    }

    // --- Phase 4: Calculate Next EMI Date ---
    let nextEmiDate: Date | null = null;
    if (outstandingBalance > 0) {
        let firstEmiDate = setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay);
        let proposedNextDate = add(firstEmiDate, { months: emisPaid });
        
        if (isBefore(proposedNextDate, asOfDate) || isSameDay(proposedNextDate, asOfDate)) {
             let nextDateFromToday = setDate(asOfDate, paymentDueDay);
             if (isBefore(nextDateFromToday, asOfDate) || isSameDay(nextDateFromToday, asOfDate)) {
                 nextDateFromToday = add(nextDateFromToday, { months: 1 });
             }
             proposedNextDate = nextDateFromToday;
        }
        nextEmiDate = proposedNextDate;
    }
    
    const perDayInterest = outstandingBalance > 0 ? (outstandingBalance * (interestRate / 100)) / 365.25 : 0;
    const totalInterestPaid = interestPaidDuringMoratorium + totalInterestPaidInRepayment;
    
    schedule.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        outstandingBalance,
        interestPaidToDate: totalInterestPaid,
        nextEmiDate: nextEmiDate ? nextEmiDate.toISOString() : null,
        originalLoanAmount,
        loanName,
        loanType,
        interestType,
        interestRate,
        perDayInterest,
        schedule,
        emiAmount,
    };
}
