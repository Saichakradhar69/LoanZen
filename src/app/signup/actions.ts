
'use server';

import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { redirect } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { setDoc, doc } from 'firebase/firestore';

export async function signupAction(prevState: any, formData: FormData) {
  const firstName = formData.get('first-name') as string;
  const lastName = formData.get('last-name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  console.log('Attempting signup with:', { firstName, lastName, email });

  // Correctly initialize Firebase services once
  const { auth, firestore } = initializeFirebase();

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update the user's profile with their name in Firebase Auth
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    });
    
    // Create the user's profile document in Firestore
    const userDocRef = doc(firestore, 'users', user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      displayName: `${firstName} ${lastName}`,
      subscriptionStatus: 'trial',
      trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      createdAt: new Date(),
    });

    console.log('✅ Signup successful! User created:', user.uid);

  } catch (error: any) {
    console.error('❌ Signup failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    let userMessage = 'An unexpected error occurred. Please try again.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        userMessage = 'This email address is already in use by another account.';
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
        // Keep the generic message for other unexpected errors
        break;
    }
    
    return { type: 'error', message: userMessage };
  }

  // Redirect to the dashboard on successful signup
  redirect('/dashboard');
}
