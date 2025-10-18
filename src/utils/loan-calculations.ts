import { add, differenceInDays, format, isBefore, isAfter, setDate, isSameDay, startOfMonth } from 'date-fns';

interface SimpleLoanData {
  originalLoanAmount: number;
  disbursementDate: Date;
  interestRate: number;
  emiAmount: number;
  emisPaid: number;
  paymentDueDay?: number;
}

export function calculateCurrentBalance(data: SimpleLoanData): number {
  const {
    originalLoanAmount,
    disbursementDate,
    interestRate,
    emiAmount,
    emisPaid,
    paymentDueDay = 1
  } = data;

  const asOfDate = new Date();
  
  // Standard loans have no moratorium, so repayment starts from the next month.
  const firstEmiDate = setDate(add(disbursementDate, { months: 1 }), paymentDueDay);
  
  // Monthly Iterative Calculation
  let balance = originalLoanAmount;
  let currentDate = startOfMonth(disbursementDate);
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  while (isBefore(currentDate, asOfDate)) {
    const monthStartDate = currentDate;
    const nextMonthStartDate = add(monthStartDate, { months: 1 });
    
    const monthlyInterestRate = interestRate / 100 / 12;
    const interestForMonth = balance * monthlyInterestRate;
    
    // Repayment Logic
    const paidEmisCount = Math.floor(differenceInDays(monthStartDate, firstEmiDate) / 30.44); // Approximate months
    const currentEmiIndex = Math.min(paidEmisCount, emisPaid);
    
    if (isAfter(monthStartDate, disbursementDate) && currentEmiIndex < emisPaid && currentEmiIndex >= 0) {
      const paymentForMonth = emiAmount;
      const interestComponent = interestForMonth;
      const principalComponent = paymentForMonth - interestComponent;
      
      // If payment doesn't cover interest, balance increases (negative amortization)
      if (principalComponent < 0) {
        balance += Math.abs(principalComponent);
      } else {
        balance -= principalComponent;
      }
    } else {
      // If it's not an EMI month yet, just accrue interest.
      balance += interestForMonth;
    }
    
    currentDate = nextMonthStartDate;
  }
  
  // Final interest accrual from the start of the current month to as-of date
  const lastCalcDate = startOfMonth(asOfDate);
  const daysSinceLastCalc = differenceInDays(asOfDate, lastCalcDate);

  if (daysSinceLastCalc > 0 && balance > 0) {
    const finalInterest = balance * (interestRate / 100 / 365.25) * daysSinceLastCalc;
    balance += finalInterest;
  }

  return Math.max(0, balance); // Ensure balance doesn't go negative
}
