# Auto-Payment Setup Guide

## ⚠️ Current Limitation

**The auto-payment feature currently only works when users visit the dashboard.** If a user doesn't log in on the payment due date, the payment won't be automatically logged.

## ✅ Solution: Scheduled Cron Job

To make auto-payments truly automatic, you need to set up a scheduled job that runs daily.

### Option 1: Vercel Cron Jobs (Recommended if deployed on Vercel)

1. **Add CRON_SECRET to environment variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `CRON_SECRET` with a random secure string (e.g., generate with: `openssl rand -hex 32`)

2. **Update vercel.json:**
   - The `vercel.json` file is already created
   - Replace `CRON_SECRET_PLACEHOLDER` with your actual `CRON_SECRET` value
   - Or use environment variable: `?secret=${process.env.CRON_SECRET}` (but Vercel doesn't support this directly)

3. **Better approach - Use Vercel Dashboard:**
   - Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
   - Click "Add Cron Job"
   - Path: `/api/loans/auto-payment`
   - Schedule: `0 2 * * *` (runs daily at 2 AM UTC)
   - Add header: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 2: External Cron Service (Works with any hosting)

1. **Set up CRON_SECRET:**
   - Add `CRON_SECRET` to your environment variables (`.env.local` for local, Vercel dashboard for production)

2. **Use a cron service like cron-job.org:**
   - Sign up at https://cron-job.org/
   - Create a new cron job
   - URL: `https://yourdomain.com/api/loans/auto-payment?secret=YOUR_CRON_SECRET`
   - Schedule: Daily at 2 AM (or your preferred time)
   - Method: GET

### Option 3: Firebase Cloud Functions (Alternative)

If you prefer Firebase, you can create a scheduled Cloud Function that calls the API endpoint.

## 🔧 How It Works

### Current Implementation (Dashboard Check)
- When user visits dashboard → Checks for due payments
- If payment is due today → Automatically logs it
- Shows notification to user

### With Cron Job (Fully Automatic)
- Cron job runs daily (e.g., 2 AM UTC)
- Checks ALL users' loans
- Processes payments for loans with `autoPay: true`
- Updates loan balances automatically
- No user interaction needed

## 📝 Environment Variable Required

Add to `.env.local` (and Vercel environment variables):

```env
CRON_SECRET=your-random-secret-string-here
```

Generate a secure secret:
```bash
# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# On Linux/Mac:
openssl rand -hex 32
```

## 🧪 Testing

### Test the API endpoint manually:

```bash
# Test with userId (for dashboard check)
curl -X POST http://localhost:3000/api/loans/auto-payment \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id"}'

# Test cron endpoint (requires secret)
curl -X GET "http://localhost:3000/api/loans/auto-payment?secret=YOUR_CRON_SECRET"
```

## ✅ What Gets Processed

1. **Loans with `autoPay: true`**
2. **Payment due date matches today** (based on `paymentDueDay`)
3. **Not already processed this month** (checks `lastAutoPaymentDate`)

## 🔒 Security

- Cron endpoint requires `CRON_SECRET` to prevent unauthorized access
- Only processes loans with `autoPay: true`
- Prevents duplicate payments for the same month
- Uses Firebase Admin SDK (bypasses security rules safely)

## 📊 Monitoring

Check Vercel logs or your hosting provider's logs to see:
- How many payments were processed
- Which loans were processed
- Any errors that occurred

## 🚀 Deployment Checklist

- [ ] Add `CRON_SECRET` to environment variables
- [ ] Set up Vercel Cron Job OR external cron service
- [ ] Test the endpoint manually first
- [ ] Monitor logs after first cron run
- [ ] Verify payments are being logged correctly

