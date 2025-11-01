# Stripe Webhook Secret Setup Guide

## What is STRIPE_WEBHOOK_SECRET?

The webhook secret is used to verify that webhook requests are actually coming from Stripe (security feature).

## For Local Development

### Option 1: Use Stripe CLI (Recommended)

1. **Install Stripe CLI**:
   - Download from: https://stripe.com/docs/stripe-cli
   - Or use: `brew install stripe/stripe-cli/stripe` (Mac)
   - Or: `choco install stripe` (Windows with Chocolatey)

2. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copy the webhook signing secret**:
   - The CLI will output something like: `> Ready! Your webhook signing secret is whsec_xxxxx`
   - Copy this value and add it to your `.env.local`:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_xxxxx
     ```

### Option 2: Skip for Development (Not Recommended but Possible)

For now, you can leave it as a placeholder if you're just testing the checkout flow. The webhook verification will fail, but the checkout will still work. However, you won't receive webhook events in development.

## For Production

1. **Go to Stripe Dashboard**:
   - Navigate to: https://dashboard.stripe.com/webhooks

2. **Add Endpoint**:
   - Click "Add endpoint"
   - Enter your production URL: `https://yourdomain.com/api/stripe/webhook`
   - Select events to listen for: `checkout.session.completed`

3. **Get the Webhook Secret**:
   - After creating the endpoint, click on it
   - Under "Signing secret", click "Reveal" or "Click to reveal"
   - Copy the secret (starts with `whsec_` or `wh_live_`)
   - Add it to your production environment variables:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_your_production_secret_here
     ```

## Important Notes

- **Development**: Use the CLI secret (starts with `whsec_`)
- **Production**: Use the dashboard secret (starts with `whsec_` or `wh_live_`)
- **Never commit secrets to git**: Keep them in `.env.local` (which should be in `.gitignore`)

## Quick Test

After setting up, you can test by:
1. Making a test purchase through your checkout
2. Check Stripe CLI output or Dashboard webhook logs to see if events are received

