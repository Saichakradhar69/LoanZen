// src/app/api/test-firebase-admin/route.ts
// Test endpoint to verify Firebase Admin SDK initialization
import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const hasKey = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const keyLength = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'loanzen-fbskl';
    
    console.log('🧪 Testing Firebase Admin SDK initialization...');
    console.log('   Has FIREBASE_SERVICE_ACCOUNT_KEY:', hasKey);
    console.log('   Key length:', keyLength);
    console.log('   Project ID:', projectId);
    
    // Try to initialize Firebase Admin
    const db = getAdminFirestore();
    
    // Try a simple read operation to verify it works
    const testRef = db.collection('users').limit(1);
    await testRef.get();
    
    return NextResponse.json({ 
      success: true,
      hasServiceAccountKey: hasKey,
      keyLength: keyLength,
      projectId: projectId,
      message: '✅ Firebase Admin initialized and working correctly'
    });
  } catch (error: any) {
    console.error('❌ Firebase Admin test failed:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message,
      errorCode: error.code,
      hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      keyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
      projectId: process.env.FIREBASE_PROJECT_ID || 'loanzen-fbskl',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

