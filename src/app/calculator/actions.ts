// src/app/calculator/actions.ts
'use server';
import 'dotenv/config';

import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';

export async function checkoutAction(
  prevState: any,
  formData: FormData,
): Promise<{type: 'success', sessionId: string} | {type: 'error', message: string}> {
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!priceId || !appUrl) {
    return {
      type: 'error',
      message: 'Payment processor not configured correctly. Missing Price ID or App URL.',
    };
  }

  // We are not using loanData for now, but this is where you would pass it
  // const loanDataString = formData.get('loanData') as string;

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
      // In a real app, you would generate a unique ID for the loan data,
      // save it to a database, and pass that ID here.
      // client_reference_id: 'temp_loan_id_123',
      // metadata: {
      //   loanDataId: 'temp_loan_id_123'
      // }
    });

    if (!session.id) {
       throw new Error('Could not create Stripe session');
    }

    return { type: 'success', sessionId: session.id };
  } catch (error) {
    console.error(error);
    return { type: 'error', message: 'Could not connect to payment processor.' };
  }
}
