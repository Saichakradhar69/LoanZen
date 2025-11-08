# Firebase Admin SDK Setup Guide

## Problem
The webhook is not updating Firestore because Firebase Admin SDK needs proper credentials to bypass security rules.

## Solution Options

### Option 1: Service Account Key (Recommended for Local Development)

1. **Get Service Account Key from Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `loanzen-fbskl`
   - Go to **Project Settings** (gear icon) → **Service Accounts**
   - Click **Generate New Private Key**
   - Save the JSON file (e.g., `firebase-service-account.json`)

2. **Add to `.env.local`:**
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"loanzen-fbskl",...}'
   ```
   
   **OR** set the file path:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
   ```

3. **Important:** Add `firebase-service-account.json` to `.gitignore` (never commit this file!)

### Option 2: Application Default Credentials (For Production/Vercel)

If deploying to Vercel or GCP:

1. **Set Environment Variable in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `FIREBASE_SERVICE_ACCOUNT_KEY` with the full JSON as the value
   - Or add `GOOGLE_APPLICATION_CREDENTIALS` with the file path

2. **For Vercel, you can also:**
   - Upload the service account JSON file
   - Reference it in environment variables

### Option 3: Use Firebase Admin SDK with Project ID Only (May Not Work)

If you're testing locally and don't have credentials set up, the webhook will fail. You **must** set up one of the options above.

## Testing the Setup

1. **Check Webhook Logs:**
   - After a payment, check your server logs (Vercel logs or local terminal)
   - Look for: `✅ Firestore Admin initialized successfully`
   - Look for: `✅ Successfully updated user {userId} subscription status`

2. **If you see errors:**
   - `❌ Failed to initialize Firebase Admin` → Credentials not set up correctly
   - `❌ Failed to update user` → Check the error details in logs

## Quick Test

After setting up credentials, make a test payment and check:
1. Stripe Dashboard → Webhooks → Check if webhook was received
2. Server logs → Check if Firestore update succeeded
3. Firestore Console → Check if user document was updated with `role: 'subscribed'`

## Troubleshooting

### Error: "Failed to initialize Firebase Admin"
- **Solution:** Make sure `FIREBASE_SERVICE_ACCOUNT_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` is set correctly

### Error: "Permission denied" or "Missing or insufficient permissions"
- **Solution:** The service account needs proper permissions. Make sure you downloaded the key from Firebase Console (it has admin permissions by default)

### Webhook received but Firestore not updated
- **Solution:** Check server logs for detailed error messages. The improved logging will show exactly where it fails.

