
'use server';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { redirect } from 'next/navigation';
import { initializeFirebase } from '@/firebase/server';
import { setDoc, doc, getDoc } from 'firebase/firestore';

async function ensureUserDocument(user: any, firestore: any, firstName: string, lastName: string) {
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        await setDoc(userDocRef, {
            email: user.email,
            displayName: `${firstName} ${lastName}`,
            subscriptionStatus: 'trial',
            trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            createdAt: new Date(),
        });
        if (user.displayName !== `${firstName} ${lastName}`) {
          await updateProfile(user, {
            displayName: `${firstName} ${lastName}`,
          });
        }
    }
}


export async function signupAction(prevState: any, formData: FormData) {
  const firstName = formData.get('first-name') as string;
  const lastName = formData.get('last-name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { auth, firestore } = initializeFirebase();

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    });
    
    await ensureUserDocument(user, firestore, firstName, lastName);

  } catch (error: any) {
    // If the error is that the email is already in use, try to sign in instead.
    if (error.code === 'auth/email-already-in-use') {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await ensureUserDocument(userCredential.user, firestore, firstName, lastName);
            // On successful login, redirect to the dashboard.
            redirect('/dashboard');
        } catch (loginError: any) {
             let userMessage = 'An unexpected error occurred during login. Please try again.';
             if (loginError.code === 'auth/wrong-password' || loginError.code === 'auth/invalid-credential') {
                userMessage = "This email is already registered, but the password you entered is incorrect.";
             }
             return { type: 'error', message: userMessage };
        }
    }
    
    // Handle other signup errors
    let userMessage = 'An unexpected error occurred. Please try again.';
    switch (error.code) {
      case 'auth/invalid-email':
        userMessage = 'The email address is not valid.';
        break;
      case 'auth/operation-not-allowed':
        userMessage = 'Email/password sign-up is not enabled for this project.';
        break;
      case 'auth/weak-password':
        userMessage = 'The password is too weak. It must be at least 6 characters long.';
        break;
      default:
        // Keep the generic message for other unexpected errors
        break;
    }
    
    return { type: 'error', message: userMessage };
  }

  // Redirect to the dashboard on successful signup
  redirect('/dashboard');
}

