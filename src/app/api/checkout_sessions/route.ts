
// src/app/api/checkout_sessions/route.ts
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // The priceId is now read from the server's environment variables
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: 'Stripe Price ID is not configured on the server.' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
      cancel_url: `${appUrl}/calculator`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Could not create Stripe session URL.' }, { status: 500 });
    }

    // Return the full session URL
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
