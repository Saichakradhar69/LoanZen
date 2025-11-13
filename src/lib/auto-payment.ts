import { Loan } from '@/app/dashboard/page';
import { addMonths, setDate, startOfDay, differenceInDays } from 'date-fns';

/**
 * Helper to convert Firestore Timestamp or Date to Date object
 */
function toDateObject(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  if (dateValue && typeof dateValue.seconds === 'number') {
    return new Date(dateValue.seconds * 1000);
  }
  const parsed = new Date(dateValue);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

/**
 * Calculate the next payment due date for a loan
 */
export function getNextPaymentDate(loan: Loan): Date | null {
  if (!loan.paymentDueDay) return null;
  
  const today = new Date();
  const dueDay = loan.paymentDueDay;
  
  // Get the due date for this month
  let nextPayment = setDate(today, dueDay);
  
  // If the due day for this month has already passed, get next month's due date
  if (nextPayment < startOfDay(today)) {
    nextPayment = addMonths(nextPayment, 1);
  }
  
  return nextPayment;
}

/**
 * Check if a payment is due today for auto-pay loans
 */
export function isPaymentDueToday(loan: Loan): boolean {
  if (!loan.autoPay) return false;
  
  const nextPayment = getNextPaymentDate(loan);
  if (!nextPayment) return false;
  
  const today = startOfDay(new Date());
  const dueDate = startOfDay(nextPayment);
  
  // Check if payment is due today (within same day)
  return differenceInDays(dueDate, today) === 0;
}

/**
 * Check if payment was already logged for this period
 */
export function wasPaymentAlreadyLogged(loan: Loan): boolean {
  if (!loan.lastAutoPaymentDate) return false;
  
  const nextPayment = getNextPaymentDate(loan);
  if (!nextPayment) return false;
  
  const lastPayment = toDateObject(loan.lastAutoPaymentDate);
  if (!lastPayment) return false;
  
  const lastPaymentMonth = lastPayment.getMonth();
  const lastPaymentYear = lastPayment.getFullYear();
  const nextPaymentMonth = nextPayment.getMonth();
  const nextPaymentYear = nextPayment.getFullYear();
  
  // Check if payment was already logged for this month/year
  return lastPaymentMonth === nextPaymentMonth && 
         lastPaymentYear === nextPaymentYear;
}

