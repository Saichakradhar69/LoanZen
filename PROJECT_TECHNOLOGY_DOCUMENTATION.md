# LoanZen - Complete Technology & Tools Documentation

## Project Overview
LoanZen is a comprehensive loan management application built with modern web technologies. It helps users understand and manage their loans through pre-loan comparison tools, post-loan tracking, and AI-powered advisory services.

---

## Table of Contents
1. [Programming Languages](#programming-languages)
2. [Frontend Technologies](#frontend-technologies)
3. [Backend Technologies](#backend-technologies)
4. [Database & Data Storage](#database--data-storage)
5. [Authentication & Security](#authentication--security)
6. [Payment Processing](#payment-processing)
7. [AI & Machine Learning](#ai--machine-learning)
8. [Email Services](#email-services)
9. [UI/UX Libraries & Frameworks](#uiux-libraries--frameworks)
10. [Development Tools](#development-tools)
11. [Build Tools & Configuration](#build-tools--configuration)
12. [Deployment & Hosting](#deployment--hosting)
13. [Third-Party APIs & Services](#third-party-apis--services)
14. [Code Quality & Testing](#code-quality--testing)
15. [File Formats & Data Export](#file-formats--data-export)

---

## Programming Languages

### 1. **TypeScript** (Primary Language)
- **Version**: 5.x
- **Usage**: 
  - Primary language for all application code
  - Type-safe development across frontend and backend
  - Configuration files (tsconfig.json, next.config.ts, tailwind.config.ts)
  - API routes, server actions, components, utilities
- **Configuration**: 
  - Target: ES2017
  - Module: ESNext
  - Module Resolution: Bundler
  - Strict mode enabled
  - Path aliases configured (@/* → ./src/*)

### 2. **JavaScript** (Configuration & Build)
- **Usage**: 
  - Configuration files (postcss.config.mjs)
  - Build scripts in package.json
  - Some utility scripts

### 3. **CSS** (Styling)
- **Usage**: 
  - Global styles (globals.css)
  - Custom CSS variables for theming
  - PDF page layout styles
  - Component-specific styles

### 4. **Firestore Security Rules Language**
- **Usage**: 
  - Security rules for Firestore database (firestore.rules)
  - Enforces user data ownership and access control
  - Version: rules_version = '2'

### 5. **YAML** (Configuration)
- **Usage**: 
  - Firebase App Hosting configuration (apphosting.yaml)
  - Vercel cron job configuration (vercel.json)

### 6. **JSON** (Configuration & Data)
- **Usage**: 
  - Package configuration (package.json, package-lock.json)
  - Firebase configuration (firebase.json)
  - Firestore indexes (firestore.indexes.json)
  - Component configuration (components.json)
  - API documentation (docs/backend.json)
  - TypeScript configuration (tsconfig.json)

---

## Frontend Technologies

### 1. **Next.js** (React Framework)
- **Version**: 15.3.3
- **Features Used**:
  - App Router (Next.js 13+ routing system)
  - Server Components
  - Server Actions
  - API Routes
  - Image optimization
  - Environment variable handling
  - Middleware support
- **Configuration**:
  - Turbopack for development (--turbopack flag)
  - TypeScript build errors ignored during builds
  - ESLint errors ignored during builds
  - Package import optimization for lucide-react
  - Remote image patterns configured

### 2. **React** (UI Library)
- **Version**: 18.3.1
- **Features Used**:
  - React Hooks (useState, useEffect, useMemo, useRef, useContext)
  - Server Components
  - Client Components
  - Context API
  - Component composition
- **React DOM**: 18.3.1

### 3. **Tailwind CSS** (Utility-First CSS Framework)
- **Version**: 3.4.1
- **Features Used**:
  - Utility classes for styling
  - Custom color system with CSS variables
  - Dark mode support (class-based)
  - Custom animations (accordion animations)
  - Responsive design utilities
  - Custom font families
  - Container queries
- **Plugins**:
  - tailwindcss-animate (v1.0.7)
  - @tailwindcss/typography (v0.5.15)

### 4. **Shadcn UI** (Component Library)
- **Style**: Default
- **Configuration**:
  - React Server Components enabled
  - TypeScript/TSX enabled
  - CSS variables for theming
  - Base color: Neutral
  - Icon library: Lucide
- **Components Used**:
  - Accordion, Alert, Alert Dialog, Avatar, Badge, Button
  - Calendar, Card, Carousel, Chart, Checkbox, Collapsible
  - Dialog, Dropdown Menu, Form, Input, Label, Menubar
  - Popover, Progress, Radio Group, Scroll Area, Select
  - Separator, Sheet, Sidebar, Skeleton, Slider, Switch
  - Table, Tabs, Textarea, Toast, Toaster, Tooltip

### 5. **Radix UI** (Headless UI Primitives)
- **Components Used** (via Shadcn UI):
  - @radix-ui/react-accordion (v1.2.3)
  - @radix-ui/react-alert-dialog (v1.1.6)
  - @radix-ui/react-avatar (v1.1.3)
  - @radix-ui/react-checkbox (v1.1.4)
  - @radix-ui/react-collapsible (v1.1.11)
  - @radix-ui/react-dialog (v1.1.6)
  - @radix-ui/react-dropdown-menu (v2.1.6)
  - @radix-ui/react-label (v2.1.2)
  - @radix-ui/react-menubar (v1.1.6)
  - @radix-ui/react-popover (v1.1.6)
  - @radix-ui/react-progress (v1.1.2)
  - @radix-ui/react-radio-group (v1.2.3)
  - @radix-ui/react-scroll-area (v1.2.3)
  - @radix-ui/react-select (v2.1.6)
  - @radix-ui/react-separator (v1.1.2)
  - @radix-ui/react-slider (v1.2.3)
  - @radix-ui/react-slot (v1.2.3)
  - @radix-ui/react-switch (v1.1.3)
  - @radix-ui/react-tabs (v1.1.3)
  - @radix-ui/react-toast (v1.2.6)
  - @radix-ui/react-tooltip (v1.1.8)

### 6. **Framer Motion** (Animation Library)
- **Version**: 12.23.24
- **Usage**: 
  - Smooth animations and transitions
  - Component animations
  - Page transitions

### 7. **Lucide React** (Icon Library)
- **Version**: 0.475.0
- **Usage**: 
  - All icons throughout the application
  - Optimized imports via Next.js package optimization

### 8. **React Hook Form** (Form Management)
- **Version**: 7.54.2
- **Usage**: 
  - Form state management
  - Form validation
  - Integration with Zod for schema validation

### 9. **Zod** (Schema Validation)
- **Version**: 3.24.2
- **Usage**: 
  - Form validation schemas
  - Type-safe validation
  - Integration with React Hook Form via @hookform/resolvers

### 10. **Date-fns** (Date Utility Library)
- **Version**: 3.6.0
- **Usage**: 
  - Date formatting and manipulation
  - Date calculations for loan schedules
  - Payment date calculations

### 11. **Recharts** (Charting Library)
- **Version**: 2.15.1
- **Usage**: 
  - Data visualization in dashboard
  - Loan progress charts
  - Payment timeline visualizations
  - Financial data graphs

### 12. **React Day Picker** (Date Picker)
- **Version**: 8.10.1
- **Usage**: 
  - Date selection in forms
  - Calendar component for loan dates

### 13. **Embla Carousel** (Carousel Component)
- **Version**: 8.6.0
- **Usage**: 
  - Image carousels
  - Content sliders

### 14. **Next Themes** (Theme Management)
- **Version**: 0.3.0
- **Usage**: 
  - Dark/light mode switching
  - Theme persistence
  - System theme detection

---

## Backend Technologies

### 1. **Next.js API Routes**
- **Usage**: 
  - RESTful API endpoints
  - Server-side logic
  - Webhook handlers
  - Cron job endpoints
- **Key Routes**:
  - `/api/loans/*` - Loan management endpoints
  - `/api/subscription/*` - Subscription management
  - `/api/stripe/webhook` - Payment webhooks
  - `/api/checkout_sessions` - Payment checkout
  - `/api/reports/*` - Report generation

### 2. **Next.js Server Actions**
- **Usage**: 
  - Server-side form processing
  - Loan calculations
  - Data mutations
  - Type-safe server functions

### 3. **Node.js Runtime**
- **Version**: Compatible with Node.js 20+
- **Usage**: 
  - Server-side JavaScript execution
  - Package management via npm

---

## Database & Data Storage

### 1. **Firebase Firestore** (NoSQL Database)
- **Version**: Firebase SDK v11.9.1
- **Usage**: 
  - User profiles storage
  - Loan data storage
  - Payment history
  - Chat sessions and messages
  - Subscription status
  - Rate history tracking
- **Data Structure**:
  - `/users/{userId}` - User profiles
  - `/users/{userId}/loans/{loanId}` - User loans
  - `/users/{userId}/loans/{loanId}/payments/{paymentId}` - Payment records
  - `/users/{userId}/loans/{loanId}/rateHistory/{rateId}` - Interest rate history
  - `/users/{userId}/chats/{chatId}` - Chat sessions
  - `/users/{userId}/chats/{chatId}/messages/{messageId}` - Chat messages
- **Security**: 
  - Firestore Security Rules (firestore.rules)
  - User-ownership model enforced
  - Strict access control

### 2. **Firebase Admin SDK** (Server-Side Database Access)
- **Version**: 13.6.0
- **Usage**: 
  - Server-side Firestore operations
  - Webhook data processing
  - Admin-level database access
  - Bypassing client-side security rules when needed

---

## Authentication & Security

### 1. **Firebase Authentication**
- **Version**: Firebase SDK v11.9.1
- **Features Used**:
  - Email/password authentication
  - User session management
  - Authentication state persistence
  - Protected routes via middleware
- **Integration**: 
  - Client-side authentication hooks
  - Server-side authentication verification
  - Non-blocking login/update patterns

### 2. **Firestore Security Rules**
- **Language**: Firestore Rules Language
- **Version**: rules_version = '2'
- **Features**:
  - User ownership validation
  - Document-level access control
  - Subcollection access control
  - Role-based access (subscribed, expired, trial)
  - Prevents unauthorized data access

### 3. **Middleware** (Next.js)
- **Usage**: 
  - Route protection
  - Authentication checks
  - Request interception

---

## Payment Processing

### 1. **Stripe** (Payment Gateway)
- **Version**: 16.5.0
- **API Version**: 2024-06-20
- **Features Used**:
  - Checkout Sessions (one-time payments)
  - Subscription management
  - Customer Portal
  - Webhooks for payment events
  - Coupon code validation
- **Client SDK**: @stripe/stripe-js v4.1.0
- **Key Features**:
  - One-time report purchases ($3.99)
  - Subscription billing
  - Payment webhook handling
  - Customer billing portal access

### 2. **Stripe Webhooks**
- **Events Handled**:
  - `checkout.session.completed` - Payment completion
  - Subscription lifecycle events
- **Security**: 
  - Webhook signature verification
  - Secret key validation

---

## AI & Machine Learning

### 1. **OpenRouter API** (AI Model Gateway)
- **Usage**: 
  - AI-powered loan advisor chat
  - Personalized loan recommendations
  - Prepayment strategy suggestions
  - Risk analysis
  - Action item generation
- **Models Used** (with fallback chain):
  - Primary: Configurable via OPENROUTER_MODEL
  - Fallbacks: 
    - openrouter/auto
    - meta-llama/llama-3.2-3b-instruct:free
    - google/gemini-flash-1.5:free
    - qwen/qwen-2.5-7b-instruct
    - deepseek/deepseek-chat:free
- **Features**:
  - Multi-model fallback system
  - Retry logic with backoff
  - Error handling for rate limits
  - Temperature control (0.2 for consistency)

### 2. **Google Genkit** (AI Development Framework)
- **Version**: 1.14.1
- **Packages**:
  - genkit (core framework)
  - @genkit-ai/googleai (v1.14.1)
  - @genkit-ai/next (v1.14.1)
  - genkit-cli (v1.14.1) - Development CLI
- **Usage**: 
  - AI flow development
  - Prepayment advisor flows
  - Development server for AI testing
- **Scripts**:
  - `genkit:dev` - Start Genkit development server
  - `genkit:watch` - Watch mode for AI flows

---

## Email Services

### 1. **Resend** (Email API)
- **Version**: 6.5.2
- **Usage**: 
  - Transactional emails
  - Report purchase confirmations
  - Email delivery with report links
  - Coupon code delivery
- **Features**:
  - API-based email sending
  - HTML email templates
  - Email delivery tracking

---

## UI/UX Libraries & Frameworks

### 1. **Class Variance Authority** (CVA)
- **Version**: 0.7.1
- **Usage**: 
  - Component variant management
  - Type-safe component styling
  - Conditional class application

### 2. **clsx** (Conditional Class Names)
- **Version**: 2.1.1
- **Usage**: 
  - Conditional CSS class application
  - Class name composition

### 3. **tailwind-merge** (Tailwind Class Merging)
- **Version**: 3.0.1
- **Usage**: 
  - Intelligent Tailwind class merging
  - Prevents class conflicts
  - Optimized class string generation

---

## Development Tools

### 1. **TypeScript** (Type Checker)
- **Version**: 5.x
- **Usage**: 
  - Static type checking
  - Type inference
  - Development-time error detection
- **Script**: `typecheck` - Runs `tsc --noEmit`

### 2. **ESLint** (Linter)
- **Usage**: 
  - Code quality checks
  - Style enforcement
  - Error detection
- **Script**: `lint` - Runs `next lint`
- **Note**: Errors ignored during builds for faster deployment

### 3. **PostCSS** (CSS Processor)
- **Version**: 8.x
- **Usage**: 
  - CSS transformation
  - Tailwind CSS processing
  - CSS optimization

### 4. **Turbopack** (Build Tool)
- **Usage**: 
  - Fast development builds
  - Hot module replacement
  - Next.js development bundler
- **Script**: `dev` - Uses `--turbopack` flag

### 5. **Patch Package** (Dependency Patching)
- **Version**: 8.0.0
- **Usage**: 
  - Apply patches to node_modules
  - Fix third-party package issues
  - Maintain custom modifications

### 6. **Dotenv** (Environment Variables)
- **Version**: 16.4.5
- **Usage**: 
  - Environment variable management
  - Configuration loading
  - Development environment setup

---

## Build Tools & Configuration

### 1. **Next.js Build System**
- **Features**:
  - Automatic code splitting
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - Incremental static regeneration (ISR)
  - Image optimization
  - Font optimization

### 2. **npm** (Package Manager)
- **Usage**: 
  - Dependency management
  - Script execution
  - Package installation
- **Files**: 
  - package.json - Project dependencies
  - package-lock.json - Locked dependency versions

### 3. **TypeScript Compiler** (tsc)
- **Usage**: 
  - Type checking
  - Compilation (no emit in Next.js)
  - Type definition generation

---

## Deployment & Hosting

### 1. **Vercel** (Primary Hosting Platform)
- **Features Used**:
  - Automatic deployments
  - Serverless functions
  - Edge network
  - Analytics integration
- **Analytics**: @vercel/analytics v1.5.0
- **Cron Jobs**: 
  - Configured in vercel.json
  - Auto-payment processing (daily at 2 AM)
- **Configuration**: vercel.json

### 2. **Firebase App Hosting** (Alternative/Additional Hosting)
- **Configuration**: apphosting.yaml
- **Features**:
  - Auto-scaling instances
  - Max instances: 1 (configurable)
  - Firebase integration

---

## Third-Party APIs & Services

### 1. **OpenRouter API**
- **Purpose**: AI model access
- **Endpoints**: 
  - `/api/v1/chat/completions`
- **Authentication**: Bearer token (API key)
- **Headers**: 
  - HTTP-Referer: https://loanzen.app
  - X-Title: LoanZen Advisor

### 2. **Stripe API**
- **Purpose**: Payment processing
- **Endpoints Used**:
  - Checkout Sessions
  - Subscriptions
  - Customers
  - Billing Portal
  - Webhooks

### 3. **Resend API**
- **Purpose**: Email delivery
- **Features**: 
  - Transactional emails
  - API-based sending

### 4. **Firebase Services**
- **Firebase Authentication API**
- **Firestore Database API**
- **Firebase Admin API**

---

## Code Quality & Testing

### 1. **TypeScript Strict Mode**
- **Enabled**: Yes
- **Features**:
  - Strict type checking
  - Null safety
  - No implicit any

### 2. **Path Aliases**
- **Configuration**: 
  - `@/*` → `./src/*`
  - Clean import paths
  - Better code organization

### 3. **Type Definitions**
- **Packages**:
  - @types/node (v20)
  - @types/react (v18)
  - @types/react-dom (v18)

---

## File Formats & Data Export

### 1. **PDF Generation**
- **Libraries**:
  - jsPDF (v2.5.1) - PDF creation
  - html2canvas (v1.4.1) - HTML to canvas conversion
  - jspdf-autotable (v3.8.2) - Table generation in PDFs
- **Usage**: 
  - Loan report generation
  - Multi-page PDF reports
  - A4 page format (800px × 1120px)
  - Transaction history tables

### 2. **CSV Export**
- **Usage**: 
  - Loan data export
  - Transaction history export
  - Amortization schedule export
  - Scenario comparison data

### 3. **JSON** (Data Format)
- **Usage**: 
  - API responses
  - Configuration files
  - Data storage in Firestore
  - Environment variables (service account keys)

### 4. **Web Manifest** (PWA Support)
- **Files**: 
  - site.webmanifest
  - Android Chrome icons (192x192, 512x512)
  - Apple touch icons
  - Favicon files

---

## Project Structure & Architecture

### **Directory Structure**:
```
LoanZen/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/        # React components
│   ├── contexts/         # React contexts
│   ├── firebase/         # Firebase integration
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   ├── utils/            # Helper functions
│   └── ai/               # AI integration (Genkit, OpenRouter)
├── public/               # Static assets
├── docs/                 # Documentation
└── Configuration files   # Various config files
```

### **Key Architectural Patterns**:
- **Server Components**: Default in Next.js App Router
- **Client Components**: Marked with 'use client'
- **Server Actions**: 'use server' directive
- **Custom Hooks**: Reusable logic abstraction
- **Context API**: Global state management (currency, theme)
- **Component Composition**: Shadcn UI pattern
- **Type Safety**: Full TypeScript coverage

---

## Environment Variables Required

### **Firebase**:
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Service account JSON (quoted)
- `FIREBASE_PROJECT_ID` - Firebase project ID

### **Stripe**:
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (NEXT_PUBLIC_)
- `STRIPE_WEBHOOK_SECRET` - Webhook signature secret
- `STRIPE_SUBSCRIPTION_PRICE_ID` - Subscription price ID

### **Email (Resend)**:
- `RESEND_API_KEY` - Resend API key
- `RESEND_FROM_EMAIL` - Sender email address

### **AI (OpenRouter)**:
- `OPENROUTER_API_KEY` - OpenRouter API key
- `OPENROUTER_MODEL` - Primary AI model (optional)
- `OPENROUTER_MODEL_FALLBACKS` - Fallback models (comma-separated)

### **Application**:
- `NEXT_PUBLIC_APP_URL` - Application base URL

---

## Development Scripts

### **Available Commands**:
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit AI development server
- `npm run genkit:watch` - Start Genkit in watch mode

---

## Summary Statistics

### **Total Technologies Used**: 50+
### **Primary Language**: TypeScript
### **Framework**: Next.js 15.3.3
### **UI Library**: React 18.3.1
### **Styling**: Tailwind CSS 3.4.1
### **Database**: Firebase Firestore
### **Authentication**: Firebase Auth
### **Payments**: Stripe
### **AI Services**: OpenRouter + Google Genkit
### **Email**: Resend
### **Hosting**: Vercel + Firebase App Hosting

---

## Version Information

- **Node.js**: 20+ (recommended)
- **npm**: Latest (via package-lock.json)
- **Next.js**: 15.3.3
- **React**: 18.3.1
- **TypeScript**: 5.x
- **Firebase SDK**: 11.9.1
- **Firebase Admin**: 13.6.0
- **Stripe**: 16.5.0

---

*This document provides a comprehensive overview of all technologies, tools, languages, and services used in the LoanZen project. For specific implementation details, refer to the source code and individual component documentation.*

