
// src/app/api/stripe/webhook/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
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
    if (event.type !== 'checkout.session.completed') {
        return;
    }
    const session = event.data.object as Stripe.Checkout.Session;
    
    if (session.payment_status === 'paid') {
      // Check if this is a subscription checkout (has userId in metadata)
      if (session.metadata?.userId) {
        // This is a subscription checkout - update user's subscription status
        const userId = session.metadata.userId;
        const subscriptionId = session.subscription as string | null;
        
        // Update user's subscription status in Firestore
        // Note: This requires server-side Firestore initialization
        // For now, we'll log and the client-side success page will handle the update
        console.log(`Subscription checkout completed for user ${userId}`);
        console.log(`Subscription ID: ${subscriptionId}`);
        console.log(`Session ID: ${session.id}`);
        
        // TODO: Update Firestore with subscription status
        // You may want to use the Firebase Admin SDK here for server-side Firestore access
        return;
      }
      
      // Otherwise, handle report payment (one-time payment)
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
    return NextResponse.json({ received: true });
  } catch (err) {
     const errorMessage = err instanceof Error ? err.message : 'Unknown error';
     console.error(`Webhook handler failed: ${errorMessage}`);
     return NextResponse.json({ error: `Webhook handler error: ${errorMessage}` }, { status: 500 });
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
