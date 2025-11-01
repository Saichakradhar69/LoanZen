
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
  try {
    const body = await request.json();
    const { appUrl, formData, formType } = body as RequestBody;
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      console.error('STRIPE_PRICE_ID is not set in environment variables');
      return NextResponse.json({ error: 'Stripe Price ID is not configured on the server.' }, { status: 500 });
    }
    
    if (!appUrl) {
      console.error('appUrl is missing from request body');
      return NextResponse.json({ error: 'Application URL was not provided by the client.' }, { status: 400 });
    }
    
    if (!formData || !formType) {
      console.error('formData or formType is missing from request body');
      return NextResponse.json({ error: 'Form data or type was not provided by the client.' }, { status: 400 });
    }

    // Check if STRIPE_SECRET_KEY is set
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set in environment variables');
      return NextResponse.json({ error: 'Stripe secret key is not configured on the server.' }, { status: 500 });
    }

    // Serialize formData and check size
    const formDataString = JSON.stringify(formData);
    if (formDataString.length > 500) {
      console.error(`Form data is too large: ${formDataString.length} characters`);
      return NextResponse.json({ error: 'The loan scenario is too complex to process in one transaction. Please simplify and try again.' }, { status: 400 });
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
        success_url: `${appUrl}/report/{CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/${formType === 'new-loan' ? 'calculator' : 'existing-loan'}?status=cancelled`,
        metadata: {
          formData: formDataString,
          formType: formType,
        }
      });

      if (!session.url) {
        console.error('Stripe session created but URL is missing');
        return NextResponse.json({ error: 'Failed to create checkout session URL.' }, { status: 500 });
      }

      return NextResponse.json({ url: session.url });
    } catch (stripeError: any) {
      console.error('Stripe API error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode,
      });
      
      const errorMessage = stripeError.message || 'Failed to create checkout session';
      
      if (errorMessage.includes('Metadata values can have up to 500 characters') || errorMessage.includes('metadata')) {
        return NextResponse.json({ error: 'The loan scenario is too complex to process in one transaction. Please simplify and try again.' }, { status: 400 });
      }
      
      const statusCode = (stripeError as any)?.statusCode || 500;
      return NextResponse.json({ error: `Payment processing error: ${errorMessage}` }, { status: statusCode });
    }
  } catch (parseError) {
    console.error('Request parsing error:', parseError);
    const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse request';
    return NextResponse.json({ error: `Request error: ${errorMessage}` }, { status: 400 });
  }
}
