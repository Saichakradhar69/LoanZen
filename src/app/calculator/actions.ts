// src/app/calculator/actions.ts
'use server';

import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import type { CalculationResults } from './page';

export async function checkoutAction(
  prevState: any,
  formData: FormData,
) {
    const host = headers().get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    const resultsString = formData.get('results') as string;
    if (!resultsString) {
        return { type: 'error', errors: { _global: ['Calculation results not found.'] } };
    }

    let results: CalculationResults;
    try {
        results = JSON.parse(resultsString);
    } catch(e) {
        return { type: 'error', errors: { _global: ['Invalid calculation results.'] } };
    }


    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Loan Report: ${results.loanName}`,
                            description: 'Full amortization schedule and loan comparison report.',
                        },
                        unit_amount: 399,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // We'll create these pages later
            success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/calculator`,
            metadata: {
                // We'll use this in the webhook to find the data
                loanData: JSON.stringify(results),
            }
        });

        if (!session.id) {
            throw new Error('Could not create Stripe session');
        }

        return { type: 'success', sessionId: session.id };
    } catch (error) {
        console.error(error);
        return { type: 'error', errors: { _global: ['Could not connect to payment processor.'] } };
    }
}
