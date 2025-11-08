# Setup Checklist - Subscription Update System

## ✅ What We've Checked

### 1. Environment Variables
- ✅ `.env.local` file exists
- ✅ `FIREBASE_SERVICE_ACCOUNT_KEY` is set (but may need quotes)
- ✅ `FIREBASE_PROJECT_ID` is set
- ⚠️ `STRIPE_WEBHOOK_SECRET` may need to be configured

### 2. Firebase Admin SDK
- ✅ `src/lib/firebase-admin.ts` exists and has initialization logic
- ✅ Supports service account key from environment variable
- ✅ Has proper error handling

### 3. API Routes
- ✅ `/api/subscription/checkout` - Creates Stripe checkout session
- ✅ `/api/subscription/manual-update` - Manual update endpoint
- ✅ `/api/stripe/webhook` - Webhook handler
- ✅ `/api/test-firebase-admin` - Test endpoint (just created)

### 4. Firestore Security Rules
- ✅ Rules prevent frontend from setting 'subscribed' role
- ✅ Admin SDK bypasses rules (server-side only)

## 🔍 Potential Issues Found

### Issue 1: FIREBASE_SERVICE_ACCOUNT_KEY Format
The key in `.env.local` might not be wrapped in quotes. It should be:
```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

Not:
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Issue 2: JSON Parsing
If the JSON has line breaks or special characters, it might fail to parse.

### Issue 3: Server Restart
After adding environment variables, the dev server must be restarted.

## 🧪 Testing Steps

1. **Test Firebase Admin Initialization:**
   - Visit: `http://localhost:3000/api/test-firebase-admin`
   - Should return: `{"success": true, ...}`

2. **Test Manual Update:**
   - Click "Activate Subscription Now" button
   - Check browser console for response
   - Check server logs for Firebase Admin messages

3. **Check Server Logs:**
   - Look for: `🔑 Initializing Firebase Admin with service account key from env`
   - Look for: `✅ Firebase Admin initialized with service account`
   - Look for: `✅ Firestore Admin initialized`

## 📋 Missing Items to Check

1. **STRIPE_WEBHOOK_SECRET** - Is it set in `.env.local`?
2. **STRIPE_SUBSCRIPTION_PRICE_ID** - Is it set correctly?
3. **Webhook endpoint** - Is it configured in Stripe Dashboard?
4. **Server restart** - Did you restart after adding environment variables?

