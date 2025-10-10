
'use server';

import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { redirect } from 'next/navigation';
import { initializeFirebase } from '@/firebase/server';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { Auth, User } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

async function createUserDocument(user: User, firestore: Firestore, firstName: string, lastName: string) {
    const userDocRef = doc(firestore, 'users', user.uid);
    // This function is only called on new user creation, so we don't need to check if it exists.
    await setDoc(userDocRef, {
        email: user.email,
        displayName: `${firstName} ${lastName}`,
        subscriptionStatus: 'trial',
        trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        createdAt: new Date(),
    });
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

    // Update the profile in Firebase Auth first
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    });
    
    // Then create the corresponding document in Firestore
    await createUserDocument(user, firestore, firstName, lastName);

  } catch (error: any) {
    let userMessage = 'An unexpected error occurred. Please try again.';
    switch (error.code) {
      case 'auth/email-already-in-use':
        userMessage = 'This email is already registered. Please use the login page.';
        break;
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
        console.error("Signup Error:", error); // Log for debugging
        break;
    }
    return { type: 'error', message: userMessage };
  }

  // Redirect to the dashboard on successful signup
  redirect('/dashboard');
}
