
// src/app/api/checkout_sessions/route.ts
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { priceId } = await request.json();

  if (!priceId) {
    return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not set in the environment variables.");
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
      cancel_url: `${appUrl}/calculator`,
    });

    // Return only the session ID
    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
