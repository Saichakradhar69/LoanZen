// src/app/existing-loan/loan-calculations/standard-loan.ts

import { add, differenceInDays, format, isBefore, isSameDay, setDate, startOfMonth } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';


export function calculateStandardLoan(data: ExistingLoanFormData): CalculationResult {
    const {
        originalLoanAmount,
        disbursementDate,
        interestRate,
        emiAmount,
        emisPaid,
        paymentDueDay,
        loanName,
        loanType,
        interestType
    } = data;
    
    if (!originalLoanAmount || !disbursementDate || !interestRate || !emiAmount || !emisPaid === undefined) {
        throw new Error("Missing required data for standard loan calculation.");
    }
    
    const schedule: Transaction[] = [];
    let balance = originalLoanAmount;
    let totalInterestPaid = 0;

    let firstEmiDate = add(new Date(disbursementDate), { months: 1 });
    firstEmiDate = setDate(firstEmiDate, paymentDueDay || new Date(disbursementDate).getDate());

    schedule.push({
        date: format(new Date(disbursementDate), 'yyyy-MM-dd'),
        type: 'disbursement',
        amount: originalLoanAmount,
        principal: originalLoanAmount,
        interest: 0,
        endingBalance: balance,
        note: 'Loan Disbursed'
    });

    let lastPaymentDate = new Date(disbursementDate);
    
    for (let i = 0; i < emisPaid; i++) {
        const paymentDate = add(firstEmiDate, { months: i });
        if (isBefore(paymentDate, new Date()) || isSameDay(paymentDate, new Date())) {
            const daysSinceLastPayment = differenceInDays(paymentDate, lastPaymentDate);
            const interestForPeriod = balance * (interestRate / 100 / 365.25) * daysSinceLastPayment;
            
            totalInterestPaid += interestForPeriod;
            
            const principalComponent = emiAmount - interestForPeriod;
            balance -= principalComponent;

            schedule.push({
                date: format(paymentDate, 'yyyy-MM-dd'),
                type: 'repayment',
                amount: emiAmount,
                principal: principalComponent,
                interest: interestForPeriod,
                endingBalance: balance,
                note: `EMI #${i + 1}`
            });
            lastPaymentDate = paymentDate;
        }
    }
    
    // Accrue interest from last payment date to today
    const daysSinceLastPayment = differenceInDays(new Date(), lastPaymentDate);
    if (daysSinceLastPayment > 0 && balance > 0) {
        const finalInterest = balance * (interestRate / 100 / 365.25) * daysSinceLastPayment;
        balance += finalInterest;
        schedule.push({
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'interest',
            amount: finalInterest,
            principal: 0,
            interest: finalInterest,
            endingBalance: balance,
            note: 'Interest accrued until today'
        });
    }

    let nextEmiDate: Date | null = null;
    if (balance > 0) {
        const lastEmiDate = add(firstEmiDate, { months: (emisPaid || 0) -1 });
        nextEmiDate = add(lastEmiDate, { months: 1 });
        if (isBefore(nextEmiDate, new Date())) {
             nextEmiDate = setDate(add(startOfMonth(new Date()), { months: 1}), paymentDueDay || 5);
        }
    }

    const perDayInterest = balance > 0 ? (balance * (interestRate / 100)) / 365.25 : 0;

    return {
        outstandingBalance: balance,
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
