# Setup Checklist - What's Missing?

## ✅ What We Found

### 1. Environment Variables Status
- ✅ `FIREBASE_SERVICE_ACCOUNT_KEY` - **FOUND** (but format issue - needs quotes)
- ✅ `FIREBASE_PROJECT_ID` - **FOUND** (loanzen-fbskl)
- ✅ `STRIPE_SECRET_KEY` - **FOUND**
- ✅ `STRIPE_SUBSCRIPTION_PRICE_ID` - **FOUND** (price_1SOS7iPDdD3CHwpoMinhDi1D)
- ⚠️ `STRIPE_WEBHOOK_SECRET` - **FOUND** but set to placeholder (`whsec_your_webhook_secret_here`)
- ⚠️ `RESEND_API_KEY` - **REQUIRED** for email sending (report purchase emails)
- ⚠️ `RESEND_FROM_EMAIL` - **OPTIONAL** (defaults to `onboarding@resend.dev` for testing)
- ⚠️ `NEXT_PUBLIC_APP_URL` - **OPTIONAL** (defaults to `http://localhost:3000`)

### 2. Code Files Status
- ✅ `src/lib/firebase-admin.ts` - **EXISTS** (Firebase Admin initialization)
- ✅ `src/app/api/subscription/checkout/route.ts` - **EXISTS** (Creates Stripe session)
- ✅ `src/app/api/subscription/manual-update/route.ts` - **EXISTS** (Manual update endpoint)
- ✅ `src/app/api/stripe/webhook/route.ts` - **EXISTS** (Webhook handler)
- ✅ `src/app/api/test-firebase-admin/route.ts` - **CREATED** (Test endpoint)
- ✅ `firestore.rules` - **EXISTS** (Security rules configured)

## 🔴 Issues Found

### Issue 1: FIREBASE_SERVICE_ACCOUNT_KEY Format (CRITICAL)
**Problem:** The key is not wrapped in quotes in `.env.local`

**Current format (WRONG):**
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**Correct format (FIXED):**
```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**Impact:** `JSON.parse()` will fail when trying to parse the environment variable, causing Firebase Admin SDK initialization to fail.

**Fix:** Run `.\fix-env-key.ps1` script (just created)

### Issue 2: STRIPE_WEBHOOK_SECRET (IMPORTANT)
**Problem:** Set to placeholder value

**Current value:**
```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Fix needed:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Create or select your webhook endpoint
3. Copy the webhook signing secret (starts with `whsec_`)
4. Update `.env.local` with the real secret

**Impact:** Webhook signature verification will fail, preventing webhook from working.

### Issue 3: Email Service Configuration (IMPORTANT)
**Problem:** Email sending for report purchases requires Resend API key

**Setup needed:**
1. Sign up at https://resend.com (free tier available)
2. Get your API key from the dashboard
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=LoanZen <noreply@yourdomain.com>  # Optional - use verified domain
   NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Optional - for production
   ```

**Note:** For development/testing, you can use `onboarding@resend.dev` as the from email (no domain verification needed).

**Impact:** Report purchase emails won't be sent if API key is missing (webhook will still succeed, but email will be skipped).

## 🧪 Testing Steps

### Step 1: Test Firebase Admin Initialization
1. Visit: `http://localhost:3000/api/test-firebase-admin`
2. Should return: `{"success": true, ...}`
3. If it fails, check server logs for error details

### Step 2: Test Manual Update
1. Make a test payment
2. Click "Activate Subscription Now" button
3. Check browser console (F12) for response
4. Check server logs (terminal) for:
   - `🔑 Initializing Firebase Admin with service account key from env`
   - `✅ Firebase Admin initialized with service account`
   - `✅ Successfully updated user {userId}`

### Step 3: Check Server Logs
Look for these messages in your terminal:
- ✅ `🔑 Initializing Firebase Admin with service account key from env`
- ✅ `✅ Firebase Admin initialized with service account`
- ✅ `✅ Firestore Admin initialized`
- ❌ `❌ Failed to initialize Firebase Admin` (if you see this, check the error)

## 📋 Action Items

1. ✅ **Fix FIREBASE_SERVICE_ACCOUNT_KEY format** - Run `.\fix-env-key.ps1`
2. ⚠️ **Set STRIPE_WEBHOOK_SECRET** - Get from Stripe Dashboard
3. ⚠️ **Set RESEND_API_KEY** - Sign up at resend.com and get API key
4. ✅ **Restart dev server** - After fixing environment variables
5. ✅ **Test Firebase Admin** - Visit `/api/test-firebase-admin`
6. ✅ **Test manual update** - Click button after payment
7. ✅ **Test email sending** - Purchase a report and check email inbox

## 🔍 Next Steps

After fixing the format:
1. Restart your dev server completely
2. Test the `/api/test-firebase-admin` endpoint
3. Try the manual update button again
4. Check server logs for success messages

