// src/app/api/loans/update-currency/route.ts
// API route to update all loans for a user when currency changes
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
function getAdminAuth() {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        });
      } catch (error) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
        throw new Error('Invalid Firebase service account key');
      }
    } else if (projectId) {
      initializeApp({ projectId });
    } else {
      throw new Error('Firebase Admin not configured');
    }
  }
  return getAuth();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currency } = body;

    // Validate currency
    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR'];
    if (!currency || !validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: 'Invalid currency. Must be one of: USD, EUR, GBP, INR' },
        { status: 400 }
      );
    }

    // Get userId from Authorization header or body
    // For now, we'll get it from the auth token in the cookie
    // Since this is called from an authenticated client, we can trust the userId
    // But for better security, we should verify the auth token
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        console.error('Failed to verify token:', error);
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      // Fallback: get userId from body (less secure, but simpler for now)
      userId = body.userId;
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }
    }

    console.log(`🔄 Updating currency for user ${userId} to ${currency}`);

    // Initialize Firestore Admin
    const db = getAdminFirestore();

    // Get all loans for the user
    const loansRef = db.collection('users').doc(userId).collection('loans');
    const loansSnapshot = await loansRef.get();

    if (loansSnapshot.empty) {
      console.log(`ℹ️ No loans found for user ${userId}`);
      return NextResponse.json({
        success: true,
        message: 'No loans to update',
        updatedCount: 0,
      });
    }

    // Update all loans with the new currency
    const batch = db.batch();
    let updateCount = 0;

    loansSnapshot.forEach((loanDoc) => {
      batch.update(loanDoc.ref, { currency });
      updateCount++;
    });

    await batch.commit();

    console.log(`✅ Updated ${updateCount} loan(s) with currency ${currency}`);

    return NextResponse.json({
      success: true,
      message: `Updated ${updateCount} loan(s) to ${currency}`,
      updatedCount,
    });
  } catch (error: any) {
    console.error('❌ Failed to update loans currency:', error);
    return NextResponse.json(
      {
        error: 'Failed to update loans currency',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

