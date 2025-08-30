
// src/app/api/checkout_sessions/route.ts
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import type { FormData as CalculatorFormData } from '@/app/calculator/form';

export async function POST(request: Request) {
  const { appUrl, formData } = (await request.json()) as { appUrl: string, formData: CalculatorFormData };
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: 'Stripe Price ID is not configured on the server.' }, { status: 500 });
  }
  
  if (!appUrl) {
    return NextResponse.json({ error: 'Application URL was not provided by the client.' }, { status: 500 });
  }
  
  if (!formData) {
    return NextResponse.json({ error: 'Form data was not provided by the client.' }, { status: 500 });
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
        formData: JSON.stringify(formData),
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    if (errorMessage.includes('Metadata values can have up to 500 characters')) {
       return NextResponse.json({ error: `Metadata error: The loan scenario is too complex to process in one transaction. Please simplify and try again.` }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
