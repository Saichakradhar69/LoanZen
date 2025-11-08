# Quick Fix: Firebase Admin SDK Not Initialized

## 🔴 The Problem

Your subscription is not updating because **Firebase Admin SDK cannot initialize without credentials**.

## ✅ The Solution (2 Minutes)

### Step 1: Get Firebase Service Account Key

1. Go to: https://console.firebase.google.com/
2. Select project: **loanzen-fbskl**
3. Click the **gear icon** (⚙️) → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Click **Generate Key** in the popup
7. A JSON file will download (e.g., `loanzen-fbskl-firebase-adminsdk-xxxxx.json`)

### Step 2: Add to .env.local

1. Open the downloaded JSON file
2. Copy the **entire contents** (it's a single JSON object)
3. Open `.env.local` in your project root
4. Add this line (replace with your actual JSON, but keep it as a single line):

```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"loanzen-fbskl","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Important:** 
- The entire JSON must be on ONE line
- Wrap it in single quotes `'...'`
- Escape any single quotes inside the JSON with `\'`

### Step 3: Restart Dev Server

1. Stop your dev server (Ctrl+C)
2. Run `npm run dev` again
3. Try the payment flow again

## 🧪 Test It

1. Make a test payment
2. Click **"Activate Subscription Now"** button on the waiting page
3. Check your server logs (terminal) - you should see:
   ```
   ✅ Firestore Admin initialized with service account
   ✅ Successfully updated user {userId}
   ```

## ❌ If It Still Doesn't Work

Check your server logs for errors:
- `❌ Failed to initialize Firebase Admin` → Credentials not set correctly
- `❌ Failed to update subscription` → Check the error details

## 🔒 Security Note

**NEVER commit the service account key to Git!** It's already in `.gitignore`, but double-check that `.env.local` is not committed.

