// src/app/api/loans/auto-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { performExistingLoanCalculations } from '@/app/existing-loan/calculations';
import { Timestamp } from 'firebase-admin/firestore';
import { setDate, addMonths, startOfDay, differenceInDays } from 'date-fns';

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
 * Process auto-payments for a specific user
 */
async function processUserAutoPayments(userId: string, db: any, today: Date) {
  const processedLoans: string[] = [];
  const skippedLoans: string[] = [];

  // Get all loans for the user
  const loansRef = db.collection('users').doc(userId).collection('loans');
  const loansSnapshot = await loansRef.get();

    for (const loanDoc of loansSnapshot.docs) {
      const loan = { id: loanDoc.id, ...loanDoc.data() };
      
      // Skip if auto-pay is not enabled
      if (!loan.autoPay) {
        continue;
      }

      const paymentDueDay = loan.paymentDueDay || 1;
      
      // Calculate next payment date
      let nextPayment = setDate(today, paymentDueDay);
      if (nextPayment < today) {
        nextPayment = addMonths(nextPayment, 1);
      }

      // Check if payment is due today
      const daysUntilDue = differenceInDays(nextPayment, today);
      if (daysUntilDue !== 0) {
        continue; // Not due yet
      }

      // Check if payment was already logged this month
      if (loan.lastAutoPaymentDate) {
        const lastPayment = toDateObject(loan.lastAutoPaymentDate);
        if (lastPayment) {
          const lastPaymentMonth = lastPayment.getMonth();
          const lastPaymentYear = lastPayment.getFullYear();
          const nextPaymentMonth = nextPayment.getMonth();
          const nextPaymentYear = nextPayment.getFullYear();
          
          // Already processed this month
          if (lastPaymentMonth === nextPaymentMonth && 
              lastPaymentYear === nextPaymentYear) {
            skippedLoans.push(`${loan.loanName} (already processed)`);
            continue;
          }
        }
      }

      try {
        // Create payment record
        const paymentRef = loanDoc.ref.collection('payments');
        await paymentRef.add({
          paymentAmount: loan.monthlyPayment,
          paymentDate: Timestamp.fromDate(today),
          createdAt: Timestamp.now(),
          isAutoPay: true, // Mark as auto-payment
        });

        // Recalculate loan balance
        const disbursementDate = toDateObject(loan.disbursementDate);
        if (!disbursementDate) {
          console.error(`Invalid disbursement date for loan ${loan.id}`);
          continue;
        }
        
        const newEmisPaid = (loan.emisPaid || 0) + 1;
        
        const calculationInput = {
          loanType: loan.loanType,
          loanName: loan.loanName,
          interestType: 'reducing',
          rateType: 'fixed',
          originalLoanAmount: loan.originalLoanAmount,
          disbursementDate: disbursementDate,
          interestRate: loan.interestRate,
          emiAmount: loan.monthlyPayment,
          emisPaid: newEmisPaid,
          paymentDueDay: paymentDueDay,
        };

        const calculatedData = performExistingLoanCalculations(calculationInput as any);
        const { outstandingBalance } = calculatedData;

        // Update loan
        await loanDoc.ref.update({
          currentBalance: outstandingBalance,
          emisPaid: newEmisPaid,
          lastAutoPaymentDate: Timestamp.fromDate(today),
        });

        processedLoans.push(loan.loanName);
        console.log(`✅ Auto-payment processed for loan: ${loan.loanName}`);
      } catch (error: any) {
        console.error(`❌ Failed to process auto-payment for loan ${loan.loanName}:`, error);
        // Continue with other loans even if one fails
      }
    }

  return {
    processedLoans,
    skippedLoans,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    const db = getAdminFirestore();
    const today = startOfDay(new Date());

    // If userId is provided, process only that user (for dashboard check)
    if (userId) {
      const result = await processUserAutoPayments(userId, db, today);
      return NextResponse.json({
        success: true,
        processedCount: result.processedLoans.length,
        processedLoans: result.processedLoans,
        skippedCount: result.skippedLoans.length,
        skippedLoans: result.skippedLoans,
      });
    }

    // If no userId, process all users (for scheduled cron job)
    // This requires a secret key to prevent unauthorized access
    const cronSecret = request.headers.get('x-cron-secret') || body.cronSecret;
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    let totalProcessed = 0;
    let totalSkipped = 0;
    const allProcessedLoans: string[] = [];

    for (const userDoc of usersSnapshot.docs) {
      try {
        const result = await processUserAutoPayments(userDoc.id, db, today);
        totalProcessed += result.processedLoans.length;
        totalSkipped += result.skippedLoans.length;
        allProcessedLoans.push(...result.processedLoans);
      } catch (error: any) {
        console.error(`Failed to process user ${userDoc.id}:`, error);
        // Continue with other users
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: totalProcessed,
      skippedCount: totalSkipped,
      processedLoans: allProcessedLoans,
      usersProcessed: usersSnapshot.size,
    });
  } catch (error: any) {
    console.error('❌ Failed to process auto-payments:', error);
    return NextResponse.json(
      {
        error: 'Failed to process auto-payments',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for Vercel Cron Jobs
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron Jobs automatically add 'x-vercel-cron' header
    // Also check for custom authorization header or query param for external cron services
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '') || 
                       request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;

    // Allow Vercel cron or verify secret for external cron services
    if (!isVercelCron && (!expectedSecret || cronSecret !== expectedSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getAdminFirestore();
    const today = startOfDay(new Date());

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    let totalProcessed = 0;
    let totalSkipped = 0;
    const allProcessedLoans: string[] = [];

    for (const userDoc of usersSnapshot.docs) {
      try {
        const result = await processUserAutoPayments(userDoc.id, db, today);
        totalProcessed += result.processedLoans.length;
        totalSkipped += result.skippedLoans.length;
        allProcessedLoans.push(...result.processedLoans);
      } catch (error: any) {
        console.error(`Failed to process user ${userDoc.id}:`, error);
        // Continue with other users
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: totalProcessed,
      skippedCount: totalSkipped,
      processedLoans: allProcessedLoans,
      usersProcessed: usersSnapshot.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Failed to process auto-payments:', error);
    return NextResponse.json(
      {
        error: 'Failed to process auto-payments',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

