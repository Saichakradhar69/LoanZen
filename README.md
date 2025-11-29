## LoanZen

LoanZen is a Next.js app that helps users understand and manage their loans:
- **Pre-loan**: compare new loan scenarios and buy a detailed PDF report.
- **Post-loan**: calculate accurate outstanding balance, view a statement, and get a detailed PDF report + CSV.
- **Advisor**: AI prepayment advisor that suggests repayment strategies.

## LoanZen – Project Overview

LoanZen is a Next.js app that helps users understand and manage their loans:
- **Pre-loan**: compare new loan scenarios and buy a detailed PDF report.
- **Post-loan**: calculate accurate outstanding balance, view a statement, and get a detailed PDF report + CSV.
- **Advisor**: AI prepayment advisor that suggests repayment strategies.

---

## Core Features

- **Existing Loan Checker** (`/existing-loan`)
  - User fills in loan details (standard, education, credit line, custom, etc.).
  - Server action computes:
    - Up-to-date outstanding balance.
    - Interest paid to date.
    - Next EMI date and detailed schedule.
  - Optional: user can purchase a **$3.99 PDF statement** + CSV export.

- **New Loan Comparison Calculator** (`/calculator`)
  - Compare multiple scenarios (different rates/terms/amounts).
  - Generates amortization schedules and summary metrics for each scenario.
  - User can purchase a **$3.99 PDF report** + CSV export.

- **AI Prepayment Advisor** (`/advisor`)
  - Only accessible if user has **trial** or **subscribed** access.
  - Uses user loan data + OpenRouter AI to chat and suggest payoff strategies.

- **Dashboard** (`/dashboard`)
  - Shows all user loans, progress, summaries, upcoming payments, AI insights.
  - Auto-payment logic: automatically logs payments when the user visits the dashboard (cron support planned).

- **Paid Report Delivery**
  - Stripe Checkout for **one-time report purchase**.
  - Stripe Webhook:
    - Reconstructs report data after payment.
    - Calls AI to generate personalized tips.
    - Sends confirmation email with report link + coupon code (`LOANZEN_TRIAL_COUPON_CODE = "LOANZEN399"`).
  - Report view page (`/report/[sessionId]`):
    - Fetches report data via `/api/stripe/webhook?session_id=...`.
    - Renders a multi-page HTML report, generates **PDF via `html2canvas` + `jsPDF`**, and **CSV**.

---

## Tech Stack

- **Frontend / App**
  - Next.js (App Router, React 18)
  - TypeScript
  - Tailwind CSS + Shadcn UI components
  - Lucide icons
- **Backend / APIs**
  - Next.js API routes (in `src/app/api`)
  - Firebase Admin SDK (for server-side Firestore access)
- **Data / Auth**
  - Firebase Authentication
  - Firestore for users, loans, subscription/access flags
- **Payments / Billing**
  - Stripe Checkout Sessions
  - Stripe Webhooks (e.g. `checkout.session.completed`)
- **AI**
  - OpenRouter API for AI tips and advisor chat
- **Email**
  - Resend API to send report purchase confirmation emails

---

## Important Flows

### 1. Existing Loan Flow (Post-loan Users)

- **UI**: `src/app/existing-loan/page.tsx`
  - Uses:
    - `ExistingLoanForm` (`src/app/existing-loan/form.tsx`)
    - `ExistingLoanResults` (`src/app/existing-loan/results.tsx`)
  - Calls server action: `calculateOutstandingBalanceAction` (`src/app/existing-loan/actions.ts`).

- **Loan Calculations**:
  - Router: `src/app/existing-loan/calculations.ts`
    - Delegates to:
      - `standard-loan.ts`
      - `education-loan.ts`
      - `credit-line.ts`
      - `custom-loan.ts`
  - Utility: `src/utils/loan-calculations.ts` for generic balance calculations.

- **After Payment (Existing Loan Report)**:
  - Stripe Checkout: `src/app/api/checkout_sessions/route.ts`
    - Uses metadata `formType = "existing-loan"`.
  - Webhook: `src/app/api/stripe/webhook/route.ts`
    - On `checkout.session.completed`:
      - Fetches stored calculation results.
      - Calls AI tips generator: `src/app/api/reports/generate-ai-tips.ts`.
      - Sends email: `src/lib/email.ts` via Resend.
  - Report Page: `src/app/report/[sessionId]/ReportContent.tsx`
    - Fetches finalized data from `/api/stripe/webhook?session_id=...`.
    - Renders:
      - Hidden HTML report using `ReportTemplate` (`src/app/calculator/report-template.tsx`).
      - PDF generation with `html2canvas` + `jsPDF`.
      - CSV export (with **transaction history moved here for post-loan users**).

### 2. New Loan Comparison Flow (Pre-loan Users)

- **UI**: `src/app/calculator/page.tsx`
  - `CalculatorForm` (`src/app/calculator/form.tsx`) collects multi-scenario inputs.
  - `CalculatorResults` (`src/app/calculator/results.tsx`) displays:
    - Monthly payment.
    - Total interest.
    - Total cost.
    - Amortization tables and summaries.
  - Internal `calculateAmortization` builds the schedule.

- **Report Generation (After Payment)**:
  - Same Stripe + Webhook + AI Tips + Email pipeline as above, with `formType = "new-loan"`.
  - `ReportTemplate` handles:
    - Multi-page layout.
    - Summary, charts, amortization tables.
    - **AI-powered recommendations**, action items, and insights.
    - Specialized layouts for **new-loan vs existing-loan**.

---

## AI Features

- **AI Tips for Reports**
  - File: `src/app/api/reports/generate-ai-tips.ts`
  - Takes final loan results (new or existing).
  - Calls OpenRouter with a structured prompt to generate:
    - Key recommendations
    - Prepayment strategies
    - Risk analysis
    - Action items (normalized to strings)
    - Refinancing opportunity (normalized to a string)

- **AI Prepayment Advisor Chat**
  - Page: `src/app/advisor/page.tsx`
    - Reads user profile via `useDoc` + `useMemoFirebase`.
    - Uses `checkUserAccess` (`src/lib/user-access.ts`) to enforce:
      - Access only for `trial` or `subscribed`.
      - Redirects to `/subscribe` if expired.
    - Renders `Chat` (`src/app/advisor/Chat.tsx`) for interactive AI chat.

---

## Dashboard & Auto-Payment

- **Dashboard Page**: `src/app/dashboard/page.tsx`
  - Shows:
    - Loan summary cards, graphs, AI insights, upcoming payments, etc.
    - Components under `src/components/dashboard/*`:
      - `LoanSummaryCards`, `YourLoans`, `UpcomingPayments`, `PaymentTimeline`, `AiInsights`, etc.
  - On load:
    - Recalculates balances via `src/app/api/loans/recalculate-balances/route.ts`.
    - Uses a `useRef` guard (`hasRecalculatedRef`) to prevent infinite loops.

- **Auto-Payment Logic**:
  - Code: `src/lib/auto-payment.ts`
  - API Route: `src/app/api/loans/auto-payment/route.ts`
  - Current behavior:
    - Processes due auto-payments when triggered (e.g. from dashboard).
  - For cron setup / true automation:
    - See `AUTO_PAYMENT_SETUP.md`.

---

## PDF & CSV Report Details

- **Template**: `src/app/calculator/report-template.tsx`
  - Implements **multi-page, A4-sized layout** for PDF:
    - Pages use `.pdf-page` class.
    - Global CSS: `src/app/globals.css` enforces:
      - `width: 800px`, `height: 1120px`, `overflow: hidden`, `page-break-after: always`.
  - Key design decisions:
    - **Removed "Complete Transaction History" table** from PDF for post-loan users (moved to CSV only).
    - Separate sections for:
      - Summary
      - Charts (now static SVG for reliability in PDFs)
      - 24-month amortization table (for new loans)
      - Year-by-year summary
      - Payment calendar (fits on one page)
      - AI-powered recommendations (split across pages if needed)
    - Uses defensive rendering for AI fields:
      - Normalizes and stringifies `refinancingOpportunity` and `actionItems` to avoid React errors.

- **CSV Export**:
  - Implemented in `ReportContent` (`src/app/report/[sessionId]/ReportContent.tsx`):
    - For **new loans**: scenario summary + amortization schedule per scenario.
    - For **existing loans**: summary + detailed `[TRANSACTION_HISTORY]` section.

---

## Access Control & User Data

- **Context / Hooks**:
  - `src/firebase/*`:
    - `useUser`, `useFirestore`, `useMemoFirebase`, `useCollection`, `useDoc`.
    - `non-blocking-login` and `non-blocking-updates` wrappers.
  - `src/contexts/currency-context.tsx`:
    - Tracks preferred currency (e.g. USD/EUR/GBP/INR).
  - `src/hooks`:
    - `use-hydration-safe`, `use-mobile`, `use-onboarding`, `use-toast`.

- **User Access & Subscription**:
  - `src/lib/user-access.ts`:
    - Determines if user has:
      - `trial`, `subscribed`, `expired`, or no access.
  - Subscription APIs under `src/app/api/subscription/*`:
    - `checkout/route.ts`, `portal/route.ts`, `manual-update/route.ts`, `status/route.ts`.

---

## Environment & Setup

For full setup details, see:

- **`SETUP_CHECKLIST.md`**
  - Environment variables to configure:
    - `FIREBASE_SERVICE_ACCOUNT_KEY` (must be quoted JSON)
    - `FIREBASE_PROJECT_ID`
    - `STRIPE_SECRET_KEY`
    - `STRIPE_SUBSCRIPTION_PRICE_ID`
    - `STRIPE_WEBHOOK_SECRET`
    - `RESEND_API_KEY`
    - `RESEND_FROM_EMAIL`
    - `NEXT_PUBLIC_APP_URL`
- **`STRIPE_WEBHOOK_SETUP.md`**
  - How to configure webhook secrets for dev and prod.
- **`AUTO_PAYMENT_SETUP.md`**
  - How to set up cron jobs (Vercel or external) for auto-payments.

---

## High-Level File Map

- **App pages** (`src/app`):
  - `page.tsx`: Marketing homepage.
  - `login/page.tsx`, `signup/page.tsx`, `subscribe/page.tsx`
  - `calculator/*`: New loan comparison + report.
  - `existing-loan/*`: Existing loan checker + report.
  - `dashboard/page.tsx`: Loan dashboard.
  - `advisor/page.tsx`: AI prepayment advisor.
  - `report/[sessionId]/*`: Paid report viewer/download.

- **APIs** (`src/app/api`):
  - `loans/*`: auto-payment, currency update, balance recalculation.
  - `subscription/*`: Stripe subscription flows.
  - `stripe/webhook/route.ts`: Stripe webhook.
  - `checkout_sessions/route.ts`: One-time report checkout.
  - `reports/generate-ai-tips.ts`: AI tips generation (no longer a route).

- **Lib / Utils**:
  - `src/lib/firebase-admin.ts`: Admin SDK.
  - `src/lib/stripe.ts`: Stripe client.
  - `src/lib/email.ts`: Resend email helper.
  - `src/lib/auto-payment.ts`: auto-payment core.
  - `src/lib/coupon-code.ts`: defines `LOANZEN_TRIAL_COUPON_CODE`.
  - `src/utils/loan-calculations.ts`: loan math helper.

---

## How to Extend

- **Add a new loan type**:
  - Implement calculations in `src/app/existing-loan/loan-calculations/<new-type>.ts`.
  - Wire into `calculations.ts` router.
  - Update UI options in `LoanOnboardingForm` and forms.

- **Change AI behavior**:
  - Adjust prompting & normalization in `src/app/api/reports/generate-ai-tips.ts`.
  - Update `advisor` flow (prompting) in `src/app/advisor/Chat.tsx`.

- **Tweak report layout**:
  - Edit `src/app/calculator/report-template.tsx`.
  - Respect `.pdf-page` dimensions and keep content within A4 bounds.



