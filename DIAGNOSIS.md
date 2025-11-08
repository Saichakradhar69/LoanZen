# Diagnosis Summary

## 🔴 Critical Issue Found

**FIREBASE_SERVICE_ACCOUNT_KEY is NOT wrapped in quotes in `.env.local`**

### Current Format (WRONG):
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Required Format (CORRECT):
```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

## Why This Breaks Everything

When the code tries to do:
```typescript
JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
```

It will fail because:
- Without quotes: `process.env.FIREBASE_SERVICE_ACCOUNT_KEY` = `{"type":"service_account",...}` (not a valid JSON string)
- With quotes: `process.env.FIREBASE_SERVICE_ACCOUNT_KEY` = `'{"type":"service_account",...}'` (valid JSON string)

## ✅ What's Working

1. ✅ All code files are in place
2. ✅ Firebase Admin initialization logic is correct
3. ✅ Webhook handler is correct
4. ✅ Manual update endpoint is correct
5. ✅ Firestore security rules are correct

## ❌ What's Missing/Broken

1. ❌ **FIREBASE_SERVICE_ACCOUNT_KEY format** - Needs quotes (CRITICAL)
2. ⚠️ **STRIPE_WEBHOOK_SECRET** - Set to placeholder value

## 🔧 How to Fix

### Option 1: Manual Fix (Recommended)
1. Open `.env.local` in a text editor
2. Find the line: `FIREBASE_SERVICE_ACCOUNT_KEY={...}`
3. Change it to: `FIREBASE_SERVICE_ACCOUNT_KEY='{...}'`
4. Wrap the entire JSON value in single quotes
5. Save the file
6. Restart your dev server

### Option 2: Use the Script
1. Run: `powershell -ExecutionPolicy Bypass -File .\fix-env-key.ps1`
2. Restart your dev server

## 🧪 After Fixing

1. **Test Firebase Admin:**
   - Visit: `http://localhost:3000/api/test-firebase-admin`
   - Should return: `{"success": true, ...}`

2. **Test Manual Update:**
   - Make a payment
   - Click "Activate Subscription Now"
   - Check server logs for: `✅ Firebase Admin initialized with service account`

3. **Check Server Logs:**
   - Look for: `🔑 Initializing Firebase Admin with service account key from env`
   - Look for: `✅ Firebase Admin initialized with service account`
   - Look for: `✅ Successfully updated user {userId}`

## 📋 Complete Checklist

- [ ] Fix FIREBASE_SERVICE_ACCOUNT_KEY format (add quotes)
- [ ] Restart dev server
- [ ] Test `/api/test-firebase-admin` endpoint
- [ ] Test manual update button
- [ ] Check server logs for success messages
- [ ] (Optional) Set real STRIPE_WEBHOOK_SECRET for webhook

