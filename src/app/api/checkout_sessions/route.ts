// src/app/api/checkout_sessions/route.ts
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import type { CalculationResults } from '@/app/calculator/page';

export async function POST(request: Request) {
  const { appUrl, calculationResults } = (await request.json()) as { appUrl: string, calculationResults: CalculationResults };
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: 'Stripe Price ID is not configured on the server.' }, { status: 500 });
  }
  
  if (!appUrl) {
    return NextResponse.json({ error: 'Application URL was not provided by the client.' }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/calculator?status=cancelled`,
      metadata: {
        // Pass the calculation results to the webhook
        results: JSON.stringify(calculationResults),
      }
    });

    // Return only the session ID to the client
    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
