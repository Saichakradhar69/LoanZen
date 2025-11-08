# Webhook Fix Summary

## ✅ What I Fixed

1. **Updated webhook to use Firestore Timestamps** - Proper date handling
2. **Added `uid` to metadata** - For consistency with the guide
3. **Simplified update logic** - Using nested objects directly with Admin SDK
4. **Enhanced logging** - Better error tracking

## 🔴 Critical Issue: Firebase Admin SDK Credentials

**The webhook will NOT work without Firebase Admin SDK credentials!**

### Why It's Failing

The webhook handler uses Firebase Admin SDK to update Firestore. Without proper credentials, the Admin SDK cannot initialize, and the webhook fails silently.

### How to Fix

**Option 1: Service Account Key (Recommended)**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `loanzen-fbskl`
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Add to `.env.local`:
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"loanzen-fbskl",...}'
   ```
   (Copy the entire JSON content as a single line)

7. **Restart your dev server**

**Option 2: File Path**

1. Save the service account JSON file as `firebase-service-account.json` in project root
2. Add to `.env.local`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
   ```

3. **Restart your dev server**

## 🧪 Testing the Webhook

### 1. Check Webhook Logs

After making a payment, check your server logs (terminal where you run `npm run dev`):

**Success logs:**
```
✅ Firestore Admin initialized successfully
🔵 Subscription checkout completed for user {userId}
✅ Successfully updated user {userId} subscription status
```

**Error logs:**
```
❌ Failed to initialize Firebase Admin: ...
❌ Failed to update user {userId} subscription: ...
```

### 2. Check Stripe Dashboard

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Check if webhook events are being received
3. Look for `checkout.session.completed` events
4. Check if they're successful (200) or failing (500)

### 3. Verify Firestore Update

1. Go to Firebase Console → Firestore Database
2. Navigate to `users/{userId}`
3. Check if `role` is `"subscribed"` and `subscriptionStatus` is `"active"`

## 🚀 Current Flow

1. **User clicks Subscribe** → Frontend calls `/api/subscription/checkout`
2. **Stripe Checkout** → User completes payment
3. **Stripe Webhook** → Calls `/api/stripe/webhook` with `checkout.session.completed` event
4. **Webhook Handler** → Uses Firebase Admin SDK to update Firestore
5. **Frontend Polls** → Dashboard checks for subscription status update
6. **Access Granted** → User sees full dashboard

## 🔧 Manual Update Fallback

If the webhook fails, you can use the manual update button on the waiting page, or call:

```bash
POST /api/subscription/manual-update
{
  "userId": "your-user-id",
  "sessionId": "stripe-session-id"
}
```

## ⚠️ Important Notes

1. **Never commit service account keys** - They're in `.gitignore`
2. **Webhook must be publicly accessible** - Use ngrok for local testing or deploy to production
3. **Stripe webhook secret must be set** - In `.env.local` as `STRIPE_WEBHOOK_SECRET`
4. **Firebase Admin bypasses security rules** - That's why it works for webhooks

## 📝 Next Steps

1. ✅ Set up Firebase Admin credentials (see above)
2. ✅ Configure Stripe webhook endpoint
3. ✅ Test with a payment
4. ✅ Check logs for errors
5. ✅ Verify Firestore update

Once credentials are set up, the webhook should work automatically!

