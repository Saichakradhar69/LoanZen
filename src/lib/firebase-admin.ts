// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

/**
 * Initialize Firebase Admin SDK
 * Uses Application Default Credentials or project ID
 */
export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    console.log('✅ Using existing Firebase Admin app');
    return adminApp;
  }

  // Initialize with project ID (works with Application Default Credentials)
  // For production, set GOOGLE_APPLICATION_CREDENTIALS environment variable
  // For local dev, you can use a service account key file
  try {
    // Try to use service account key from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('🔑 Initializing Firebase Admin with service account key from env');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'loanzen-fbskl',
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use Application Default Credentials from file path
      console.log('🔑 Initializing Firebase Admin with Application Default Credentials');
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'loanzen-fbskl',
      });
      console.log('✅ Firebase Admin initialized with Application Default Credentials');
    } else {
      // For local development or Vercel, try to initialize with project ID
      // This will work if Firebase is configured in the environment
      console.log('⚠️ Initializing Firebase Admin with project ID only (may require credentials)');
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'loanzen-fbskl',
      });
      console.log('✅ Firebase Admin initialized with project ID');
    }
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    
    // Try fallback initialization
    try {
      console.log('🔄 Attempting fallback initialization...');
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'loanzen-fbskl',
      });
      console.log('✅ Fallback initialization successful');
    } catch (fallbackError: any) {
      console.error('❌ Fallback initialization also failed:', fallbackError);
      throw new Error(`Failed to initialize Firebase Admin: ${fallbackError?.message || 'Unknown error'}`);
    }
  }

  return adminApp;
}

/**
 * Get Firestore Admin instance
 */
export function getAdminFirestore(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  try {
    const app = getAdminApp();
    adminDb = getFirestore(app);
    console.log('✅ Firestore Admin instance created');
    return adminDb;
  } catch (error: any) {
    console.error('❌ Failed to get Firestore Admin instance:', error);
    throw error;
  }
}

/**
 * Helper to convert Date to Firestore Timestamp
 */
export function toFirestoreTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

