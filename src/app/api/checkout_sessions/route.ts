// src/app/api/checkout_sessions/route.ts
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { appUrl } = await request.json();
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
