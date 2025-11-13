// src/app/api/account/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

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

    console.log(`🗑️ Deleting account and data for user ${userId}`);

    const db = getAdminFirestore();

    // Get user document to check for Stripe subscription
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData?.subscription?.stripeCustomerId;
    const stripeSubscriptionId = userData?.subscription?.stripeSubscriptionId;

    // Cancel Stripe subscription if exists
    if (stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(stripeSubscriptionId);
        console.log(`✅ Canceled Stripe subscription ${stripeSubscriptionId}`);
      } catch (error: any) {
        console.error('Failed to cancel Stripe subscription:', error);
        // Continue with deletion even if subscription cancellation fails
      }
    }

    // Delete all loans and their payments
    const loansRef = userRef.collection('loans');
    const loansSnapshot = await loansRef.get();

    const batch = db.batch();
    let deleteCount = 0;

    for (const loanDoc of loansSnapshot.docs) {
      // Delete all payments for this loan
      const paymentsRef = loanDoc.ref.collection('payments');
      const paymentsSnapshot = await paymentsRef.get();
      
      paymentsSnapshot.forEach((paymentDoc) => {
        batch.delete(paymentDoc.ref);
        deleteCount++;
      });

      // Delete the loan
      batch.delete(loanDoc.ref);
      deleteCount++;
    }

    // Delete user document
    batch.delete(userRef);
    deleteCount++;

    await batch.commit();

    console.log(`✅ Deleted ${deleteCount} documents for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data deleted successfully',
      deletedCount: deleteCount,
    });
  } catch (error: any) {
    console.error('❌ Failed to delete account:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete account',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

