// src/app/api/loans/recalculate-balances/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { performExistingLoanCalculations } from '@/app/existing-loan/calculations';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Helper to convert Firestore Timestamp to Date object
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
 * Recalculate balance for a single loan
 */
async function recalculateLoanBalance(loan: any, db: any) {
  try {
    const disbursementDate = toDateObject(loan.disbursementDate);
    if (!disbursementDate) {
      console.error(`Invalid disbursement date for loan ${loan.id}`);
      return null;
    }

    // Prepare calculation input based on loan type
    const calculationInput: any = {
      loanType: loan.loanType === 'student' ? 'education' : loan.loanType, // Map student to education
      loanName: loan.loanName,
      interestType: loan.interestType || 'reducing',
      rateType: loan.rateType || 'fixed',
      originalLoanAmount: loan.originalLoanAmount,
      disbursementDate: disbursementDate,
      interestRate: loan.interestRate,
      emiAmount: loan.monthlyPayment || 0,
      emisPaid: loan.emisPaid || 0,
      paymentDueDay: loan.paymentDueDay || 1,
      missedEmis: loan.missedEmis || 0,
    };

    // Add loan-type-specific fields
    if (loan.loanType === 'education' || loan.loanType === 'student') {
      calculationInput.moratoriumPeriod = loan.moratoriumPeriod || 0;
      calculationInput.moratoriumInterestType = loan.moratoriumInterestType || 'none';
      calculationInput.moratoriumPaymentAmount = loan.moratoriumPaymentAmount;
      calculationInput.missedEmis = loan.missedEmis || 0;
      
      // Add disbursements if they exist
      if (loan.disbursements && loan.disbursements.length > 0) {
        calculationInput.disbursements = loan.disbursements.map((d: any) => ({
          date: toDateObject(d.date) || disbursementDate,
          amount: d.amount,
        }));
      }
    }

    // For credit lines, use transactions
    if (loan.loanType === 'credit-line' && loan.transactions) {
      calculationInput.transactions = loan.transactions.map((t: any) => ({
        date: toDateObject(t.date) || new Date(),
        amount: t.amount,
        type: t.type,
      }));
    }

    // Add rate changes if they exist
    if (loan.rateChanges && loan.rateChanges.length > 0) {
      calculationInput.rateChanges = loan.rateChanges.map((rc: any) => ({
        date: toDateObject(rc.date) || new Date(),
        rate: rc.rate,
      }));
    }

    // Recalculate balance
    const calculatedData = performExistingLoanCalculations(calculationInput);
    const { outstandingBalance } = calculatedData;

    return outstandingBalance;
  } catch (error: any) {
    console.error(`Failed to recalculate balance for loan ${loan.loanName}:`, error);
    return null;
  }
}

/**
 * Recalculate balances for all loans of a user
 */
async function recalculateUserLoanBalances(userId: string, db: any) {
  const loansRef = db.collection('users').doc(userId).collection('loans');
  const loansSnapshot = await loansRef.get();
  
  const updatedLoans: string[] = [];
  const failedLoans: string[] = [];

  for (const loanDoc of loansSnapshot.docs) {
    const loan = { id: loanDoc.id, ...loanDoc.data() };
    
    // Skip credit cards - they work differently (current balance is the principal, not original amount)
    // Credit card balances are better updated through transactions/payments
    if (loan.loanType === 'credit-card') {
      continue;
    }

    const newBalance = await recalculateLoanBalance(loan, db);
    
    if (newBalance !== null && newBalance !== loan.currentBalance) {
      try {
        await loanDoc.ref.update({
          currentBalance: newBalance,
          lastBalanceUpdate: Timestamp.now(),
        });
        updatedLoans.push(loan.loanName);
      } catch (error: any) {
        console.error(`Failed to update loan ${loan.loanName}:`, error);
        failedLoans.push(loan.loanName);
      }
    }
  }

  return {
    updatedLoans,
    failedLoans,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const result = await recalculateUserLoanBalances(userId, db);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedLoans.length,
      updatedLoans: result.updatedLoans,
      failedCount: result.failedLoans.length,
      failedLoans: result.failedLoans,
    });
  } catch (error: any) {
    console.error('Failed to recalculate balances:', error);
    return NextResponse.json(
      {
        error: 'Failed to recalculate balances',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

