
'use server';

import { signInWithEmailAndPassword } from "firebase/auth";
import { redirect } from 'next/navigation';
import { initializeFirebase } from "@/firebase/server";
import { doc, getDoc, setDoc } from "firebase/firestore";

async function ensureUserDocumentOnLogin(user: any, firestore: any) {
  const userDocRef = doc(firestore, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
      // User exists in Auth, but not in Firestore. Create the document.
      await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || 'New User', // Fallback display name
          subscriptionStatus: 'trial', // Default status for recovered accounts
          trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
      });
  }
}

export async function loginAction(
  prevState: any,
  formData: FormData,
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  try {
    const { auth, firestore } = initializeFirebase();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDocumentOnLogin(userCredential.user, firestore);

  } catch (error: any) {
    let message = "An unexpected error occurred.";
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Invalid email or password.";
    } else if (error.code === 'auth/invalid-email') {
        message = "Please enter a valid email address.";
    }
    return { type: 'error', message };
  }

  redirect('/dashboard');
}
