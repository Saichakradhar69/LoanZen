// src/app/api/subscription/checkout/route.ts
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userEmail } = body;

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'User ID and email are required.' }, { status: 400 });
    }

    const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || 'price_1SOS7iPDdD3CHwpoMinhDi1D';

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe secret key is not configured.' }, { status: 500 });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        customer_email: userEmail,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${request.headers.get('origin') || 'http://localhost:3000'}/dashboard?subscription=success`,
        cancel_url: `${request.headers.get('origin') || 'http://localhost:3000'}/signup?subscription=cancelled`,
        metadata: {
          userId: userId,
          userEmail: userEmail,
        },
      });

      if (!session.url) {
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
      const statusCode = (stripeError as any)?.statusCode || 500;
      return NextResponse.json({ error: `Payment processing error: ${errorMessage}` }, { status: statusCode });
    }
  } catch (parseError) {
    console.error('Request parsing error:', parseError);
    const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse request';
    return NextResponse.json({ error: `Request error: ${errorMessage}` }, { status: 400 });
  }
}

