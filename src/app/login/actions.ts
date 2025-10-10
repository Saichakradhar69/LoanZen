
'use server';

import { signInWithEmailAndPassword } from "firebase/auth";
import { redirect } from 'next/navigation';
import { initializeFirebase } from "@/firebase/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Auth, User } from "firebase/auth";
import { Firestore } from "firebase/firestore";

async function ensureUserDocumentOnLogin(user: User, firestore: Firestore) {
  if (!user) return;
  const userDocRef = doc(firestore, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
      // User exists in Auth, but not in Firestore. This can happen if signup failed midway.
      // We create the document now to fix the inconsistent state.
      await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || 'New User', // Fallback display name
          subscriptionStatus: 'trial', // Default status for recovered accounts
          trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
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
  
  const { auth, firestore } = initializeFirebase();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDocumentOnLogin(userCredential.user, firestore);
  } catch (error: any) {
    let message = "An unexpected error occurred.";
    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            message = "Invalid email or password.";
            break;
        case 'auth/invalid-email':
            message = "Please enter a valid email address.";
            break;
        case 'auth/too-many-requests':
            message = "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.";
            break;
        default:
            console.error("Login Error:", error); // Log the full error for debugging
            break;
    }
    return { type: 'error', message };
  }

  redirect('/dashboard');
}
