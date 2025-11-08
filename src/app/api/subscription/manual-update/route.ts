// src/app/api/subscription/manual-update/route.ts
// Temporary endpoint to manually update subscription status
// This can be used for testing or as a fallback if webhook fails
import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, sessionId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`🔄 Manual subscription update requested for user ${userId}`);

    let subscriptionId: string | null = null;
    let customerId: string | null = null;

    // If sessionId is provided, retrieve subscription from Stripe
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        subscriptionId = session.subscription as string | null;
        customerId = session.customer as string | null;
        console.log(`📋 Retrieved session: subscriptionId=${subscriptionId}, customerId=${customerId}`);
      } catch (error: any) {
        console.error('❌ Failed to retrieve session:', error);
        return NextResponse.json({ 
          error: 'Failed to retrieve session from Stripe',
          details: error.message 
        }, { status: 500 });
      }
    }

    if (!subscriptionId) {
      return NextResponse.json({ 
        error: 'No subscription ID found. Please provide sessionId or subscriptionId' 
      }, { status: 400 });
    }

    try {
      // Initialize Firestore Admin
      let db;
      try {
        db = getAdminFirestore();
        console.log('✅ Firestore Admin initialized');
      } catch (initError: any) {
        console.error('❌ Firebase Admin initialization failed:', initError);
        return NextResponse.json({ 
          error: 'Firebase Admin SDK initialization failed',
          details: initError?.message || 'Unknown error',
          hint: 'Make sure FIREBASE_SERVICE_ACCOUNT_KEY is set in .env.local',
          stack: process.env.NODE_ENV === 'development' ? initError?.stack : undefined
        }, { status: 500 });
      }

      // Retrieve subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`✅ Subscription retrieved: ${subscription.status}`);

      // Get user document
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return NextResponse.json({ error: 'User document does not exist' }, { status: 404 });
      }

      const existingData = userDoc.data();
      console.log(`📄 Existing user data:`, {
        role: existingData?.role,
        subscriptionStatus: existingData?.subscriptionStatus,
      });

      // Prepare update data with Firestore Timestamp
      const currentPeriodEndDate = new Date(subscription.current_period_end * 1000);
      const currentPeriodEndTimestamp = Timestamp.fromDate(currentPeriodEndDate);
      
      const updateData: any = {
        role: 'subscribed',
        subscriptionStatus: 'active',
        subscription: {
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: currentPeriodEndTimestamp,
          status: subscription.status === 'active' ? 'active' : subscription.status,
        },
      };

      // Deactivate trial if it exists
      if (existingData?.trial) {
        updateData.trial = {
          ...existingData.trial,
          isActive: false,
        };
      }

      // Update Firestore
      await userRef.update(updateData);
      console.log(`✅ Successfully updated user ${userId}`);

      // Verify update
      const updatedDoc = await userRef.get();
      const updatedData = updatedDoc.data();
      console.log(`✅ Verified update:`, {
        role: updatedData?.role,
        subscriptionStatus: updatedData?.subscriptionStatus,
      });

      return NextResponse.json({ 
        success: true,
        message: 'Subscription updated successfully',
        data: {
          role: updatedData?.role,
          subscriptionStatus: updatedData?.subscriptionStatus,
        }
      });
    } catch (error: any) {
      console.error('❌ Failed to update subscription:', error);
      return NextResponse.json({ 
        error: 'Failed to update subscription',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Request error:', error);
    return NextResponse.json({ 
      error: 'Request error',
      details: error.message 
    }, { status: 400 });
  }
}

