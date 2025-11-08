import Stripe from 'stripe';
import 'dotenv/config';

let stripeInstance: Stripe | null = null;

function getStripeInstance(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables. Please add it to your .env.local file.');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
      typescript: true,
    });
  }
  return stripeInstance;
}

// Export a getter function that lazy-loads the Stripe instance
export function getStripe(): Stripe {
  return getStripeInstance();
}

// Export stripe object that lazy-loads on access
export const stripe = {
  get checkout() {
    return getStripeInstance().checkout;
  },
  get webhooks() {
    return getStripeInstance().webhooks;
  },
  get subscriptions() {
    return getStripeInstance().subscriptions;
  }
} as Stripe;

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('STRIPE_WEBHOOK_SECRET is not set. Webhook signature validation will be skipped in development, but is required for production.');
}
