
// src/app/api/checkout_sessions/route.ts
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import type { FormData as CalculatorFormData } from '@/app/calculator/form';
import type { ExistingLoanFormData } from '@/app/existing-loan/form';


type RequestBody = {
    appUrl: string;
    formData: CalculatorFormData | ExistingLoanFormData;
    formType: 'new-loan' | 'existing-loan';
}

export async function POST(request: Request) {
  const { appUrl, formData, formType } = (await request.json()) as RequestBody;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: 'Stripe Price ID is not configured on the server.' }, { status: 500 });
  }
  
  if (!appUrl) {
    return NextResponse.json({ error: 'Application URL was not provided by the client.' }, { status: 500 });
  }
  
  if (!formData || !formType) {
    return NextResponse.json({ error: 'Form data or type was not provided by the client.' }, { status: 500 });
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
      cancel_url: `${appUrl}/${formType === 'new-loan' ? 'calculator' : 'existing-loan'}?status=cancelled`,
      metadata: {
        formData: JSON.stringify(formData),
        formType: formType,
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
