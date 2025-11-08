
// src/app/api/stripe/webhook/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminFirestore, toFirestoreTimestamp } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { FormData as CalculatorFormData } from '@/app/calculator/form';
import type { ExistingLoanFormData, CalculationResult as ExistingLoanCalculationResult } from '@/app/existing-loan/actions';
import { performExistingLoanCalculations } from '@/app/existing-loan/calculations';

// --- Data types needed for recalculation ---

export type AmortizationData = {
  month: number;
  monthlyPayment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

export type ScenarioResult = {
  scenarioName: string;
  totalInterest: number;
  totalPayment: number;
  monthlyPayment: number;
  amortizationSchedule: AmortizationData[];
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
};

export type NewLoanCalculationResults = {
  formType: 'new-loan';
  loanName: string;
  loanType: string;
  interestRateType: string;
  scenarios: ScenarioResult[];
  userEmail: string | null;
  generatedAt: string;
  couponCode: string;
};

export type ExistingLoanReportResults = {
    formType: 'existing-loan';
    userEmail: string | null;
    generatedAt: string;
    couponCode: string;
} & ExistingLoanCalculationResult;


export type CalculationResults = NewLoanCalculationResults | ExistingLoanReportResults;

// --- Calculation logic moved to the server ---

function calculateAmortization(loanAmount: number, annualInterestRate: number, loanTermYears: number) {
  const monthlyInterestRate = annualInterestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;
  
  if (monthlyInterestRate <= 0) {
    const monthlyPayment = loanAmount / numberOfPayments;
    const amortizationSchedule = [];
    for (let i = 1; i <= numberOfPayments; i++) {
        amortizationSchedule.push({
            month: i,
            monthlyPayment: monthlyPayment,
            principal: monthlyPayment,
            interest: 0,
            remainingBalance: loanAmount - (monthlyPayment * i)
        });
    }
    return {
        monthlyPayment: monthlyPayment,
        totalInterest: 0,
        totalPayment: loanAmount,
        amortizationSchedule,
    };
  }

  const powerTerm = Math.pow(1 + monthlyInterestRate, numberOfPayments);
  
  const monthlyPayment = (loanAmount * monthlyInterestRate * powerTerm) / (powerTerm - 1);

  let balance = loanAmount;
  let totalInterest = 0;
  const amortizationSchedule: AmortizationData[] = [];

  for (let month = 1; month <= numberOfPayments; month++) {
    const interest = balance * monthlyInterestRate;
    const principal = monthlyPayment - interest;
    
    balance -= principal;
    totalInterest += interest;

    amortizationSchedule.push({
      month,
      monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
      principal: parseFloat(principal.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      remainingBalance: parseFloat(Math.abs(balance).toFixed(2)),
    });
    
    if (balance <= 0) break;
  }

  const finalTotalPayment = loanAmount + totalInterest;

  return {
    monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    totalPayment: parseFloat(finalTotalPayment.toFixed(2)),
    amortizationSchedule,
  };
}


function performNewLoanCalculations(formData: CalculatorFormData, userEmail: string | null): Omit<NewLoanCalculationResults, 'couponCode' | 'generatedAt' | 'formType'> {
    const calculatedScenarios = formData.scenarios.map((scenario) => {
      const { monthlyPayment, totalInterest, totalPayment, amortizationSchedule } = calculateAmortization(
        scenario.loanAmount,
        scenario.interestRate,
        scenario.loanTerm
      );
      return {
        scenarioName: scenario.scenarioName,
        totalInterest,
        totalPayment,
        monthlyPayment,
        amortizationSchedule,
        loanAmount: scenario.loanAmount,
        interestRate: scenario.interestRate,
        loanTerm: scenario.loanTerm
      };
    });
    return {
      loanName: formData.loanName,
      loanType: formData.loanType,
      interestRateType: formData.interestRateType,
      scenarios: calculatedScenarios,
      userEmail: userEmail,
    };
}


function generateCouponCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'PREMIUM-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}


async function handleStripeWebhook(event: Stripe.Event) {
    console.log(`📥 Received webhook event: ${event.type}`);
    
    let db;
    try {
        db = getAdminFirestore();
        console.log('✅ Firestore Admin initialized successfully');
    } catch (error: any) {
        console.error('❌ Failed to initialize Firestore Admin:', error);
        console.error('Error details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack,
        });
        throw new Error(`Firestore Admin initialization failed: ${error?.message || 'Unknown error'}`);
    }
    
    // Handle subscription checkout completion
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log(`📋 Checkout session: ${session.id}, Payment status: ${session.payment_status}`);
        
        if (session.payment_status === 'paid') {
            // Check if this is a subscription checkout (has uid or userId in metadata)
            const userId = session.metadata?.uid || session.metadata?.userId;
            if (userId) {
                // This is a subscription checkout - update user's subscription status
                const subscriptionId = session.subscription as string | null;
                const customerId = session.customer as string | null;
                
                console.log(`🔵 Subscription checkout completed for user ${userId}`);
                console.log(`   Subscription ID: ${subscriptionId}`);
                console.log(`   Customer ID: ${customerId}`);
                console.log(`   Session ID: ${session.id}`);
                
                if (!subscriptionId) {
                    console.error('❌ No subscription ID found in session');
                    throw new Error('No subscription ID found in checkout session');
                }
                
                try {
                    // Retrieve full subscription details from Stripe
                    console.log(`📞 Retrieving subscription details from Stripe...`);
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    console.log(`✅ Subscription retrieved: ${subscription.status}`);
                    
                    // Update user's subscription status in Firestore using Admin SDK
                    const userRef = db.collection('users').doc(userId);
                    
                    // Get existing user data to preserve trial info
                    console.log(`📖 Reading existing user document...`);
                    const userDoc = await userRef.get();
                    
                    if (!userDoc.exists) {
                        console.error(`❌ User document ${userId} does not exist`);
                        throw new Error(`User document ${userId} does not exist`);
                    }
                    
                    const existingData = userDoc.data();
                    console.log(`📄 Existing user data:`, {
                        role: existingData?.role,
                        subscriptionStatus: existingData?.subscriptionStatus,
                        hasTrial: !!existingData?.trial,
                    });
                    
                    // Prepare update data with Firestore Timestamp
                    // Use Firestore Timestamp for proper date handling
                    const currentPeriodEndDate = new Date(subscription.current_period_end * 1000);
                    const currentPeriodEndTimestamp = Timestamp.fromDate(currentPeriodEndDate);
                    
                    // Build update data - Admin SDK supports nested objects directly
                    const updateData: any = {
                        role: 'subscribed',
                        subscriptionStatus: 'active', // Legacy field for backward compatibility
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
                        console.log(`🔄 Deactivating trial`);
                    }
                    
                    console.log(`📝 Updating user document with:`, {
                        role: updateData.role,
                        subscriptionStatus: updateData.subscriptionStatus,
                        subscriptionStatusValue: updateData.subscription.status,
                    });
                    
                    // Update Firestore using Admin SDK (bypasses security rules)
                    // Admin SDK update() supports nested objects directly
                    await userRef.update(updateData);
                    
                    // Verify the update
                    const updatedDoc = await userRef.get();
                    const updatedData = updatedDoc.data();
                    console.log(`✅ Successfully updated user ${userId} subscription status`);
                    console.log(`   New role: ${updatedData?.role}`);
                    console.log(`   New subscriptionStatus: ${updatedData?.subscriptionStatus}`);
                    console.log(`   Subscription status: ${updatedData?.subscription?.status}`);
                } catch (error: any) {
                    console.error(`❌ Failed to update user ${userId} subscription:`, error);
                    console.error('Error details:', {
                        message: error?.message,
                        code: error?.code,
                        stack: error?.stack,
                    });
                    throw error; // Re-throw to trigger webhook retry
                }
                
                return;
            }
        }
    }
    
    // Handle subscription lifecycle events
    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        console.log(`Subscription ${event.type} for customer ${customerId}`);
        
        try {
            // Find user by Stripe customer ID
            const usersSnapshot = await db.collection('users')
                .where('subscription.stripeCustomerId', '==', customerId)
                .limit(1)
                .get();
            
            if (usersSnapshot.empty) {
                console.warn(`No user found with customer ID ${customerId}`);
                return;
            }
            
            const userDoc = usersSnapshot.docs[0];
            const userRef = userDoc.ref;
            
            if (event.type === 'customer.subscription.deleted') {
                // Subscription was canceled - mark as expired
                await userRef.update({
                    role: 'expired',
                    'subscription.status': 'canceled',
                    subscriptionStatus: 'expired',
                });
                console.log(`✅ Marked user ${userDoc.id} as expired`);
            } else if (event.type === 'customer.subscription.updated') {
                // Subscription was updated (e.g., renewed, changed plan)
                await userRef.update({
                    'subscription.status': subscription.status,
                    'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
                    subscriptionStatus: subscription.status === 'active' ? 'active' : 'expired',
                });
                console.log(`✅ Updated subscription for user ${userDoc.id}`);
            }
        } catch (error) {
            console.error(`❌ Failed to handle subscription ${event.type}:`, error);
            throw error;
        }
        
        return;
    }
    
    // Handle invoice payment failures
    if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string | null;
        
        console.log(`Invoice payment failed for customer ${customerId}`);
        
        if (subscriptionId) {
            try {
                // Find user by Stripe customer ID
                const usersSnapshot = await db.collection('users')
                    .where('subscription.stripeCustomerId', '==', customerId)
                    .limit(1)
                    .get();
                
                if (!usersSnapshot.empty) {
                    const userRef = usersSnapshot.docs[0].ref;
                    await userRef.update({
                        'subscription.status': 'incomplete',
                        subscriptionStatus: 'expired',
                    });
                    console.log(`✅ Marked user ${usersSnapshot.docs[0].id} subscription as incomplete`);
                }
            } catch (error) {
                console.error(`❌ Failed to handle payment failure:`, error);
            }
        }
        
        return;
    }
    
    // Handle report payment (one-time payment) - existing logic
    if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
        if (session.payment_status === 'paid' && !session.metadata?.userId) {
            // This is a report payment (one-time payment)
      const formDataString = session.metadata?.formData;
      if (!formDataString) {
          console.error("Webhook Error: No form data found in session metadata.");
          return;
      }
      
      // In a real application, you would save the calculated data to a database (e.g., Firestore)
      // using the session.id as the document key. This allows the "Thank You" page to retrieve it.
      // For this demo, we'll just log that we would do this.
      
      console.log(`--- SIMULATING DATABASE WRITE ---`);
      console.log(`Payment for session ${session.id} successful.`);
      console.log(`Would save calculation data to DB for client retrieval.`);
      console.log(`User email: ${session.customer_details?.email}`);
        }
    }
}

// This GET handler now serves the raw data for the report,
// instead of generating the file itself.
async function handleGetRequest(req: NextRequest) {
    const sessionId = req.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const formDataString = session.metadata?.formData;
        const formType = session.metadata?.formType as 'new-loan' | 'existing-loan' | undefined;
        const userEmail = session.customer_details?.email || null;

        if (!formDataString || !formType) {
            return NextResponse.json({ error: 'Form data or type not found in session.' }, { status: 404 });
        }
        
        let finalResults: CalculationResults;

        if (formType === 'new-loan') {
            const formData: CalculatorFormData = JSON.parse(formDataString);
            const partialResults = performNewLoanCalculations(formData, userEmail);
             finalResults = {
                ...partialResults,
                formType: 'new-loan',
                generatedAt: new Date().toISOString(),
                couponCode: generateCouponCode(),
            };
        } else { // existing-loan
            const formData: ExistingLoanFormData = JSON.parse(formDataString);
            const calculatedData = performExistingLoanCalculations(formData);
            finalResults = {
                ...calculatedData,
                formType: 'existing-loan',
                userEmail: userEmail,
                generatedAt: new Date().toISOString(),
                couponCode: generateCouponCode(),
            };
        }

        return NextResponse.json(finalResults);

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to retrieve session or get report data: ${errorMessage}`);
        return NextResponse.json({ error: `Failed to get report data: ${errorMessage}` }, { status: 500 });
    }
}


export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook secret is not configured.' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  try {
    await handleStripeWebhook(event);
    console.log('✅ Webhook handler completed successfully');
    return NextResponse.json({ received: true });
  } catch (err) {
     const errorMessage = err instanceof Error ? err.message : 'Unknown error';
     const errorStack = err instanceof Error ? err.stack : undefined;
     console.error(`❌ Webhook handler failed: ${errorMessage}`);
     console.error('Error stack:', errorStack);
     // Return 500 to trigger Stripe webhook retry
     return NextResponse.json({ 
       error: `Webhook handler error: ${errorMessage}`,
       details: process.env.NODE_ENV === 'development' ? errorStack : undefined
     }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    try {
        return await handleGetRequest(req);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`GET request handler failed: ${errorMessage}`);
        return NextResponse.json({ error: `An unexpected error occurred: ${errorMessage}` }, { status: 500 });
    }
}
