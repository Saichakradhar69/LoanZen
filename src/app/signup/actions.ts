'use server';

import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { redirect } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { getFirestore, setDoc, doc, serverTimestamp } from 'firebase/firestore';

export async function signupAction(prevState: any, formData: FormData) {
  const firstName = formData.get('first-name') as string;
  const lastName = formData.get('last-name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    // Initialize Firebase once and get all required services.
    const { auth, firestore } = initializeFirebase();

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update user profile display name
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    });

    // Add user document to Firestore
    const userDocRef = doc(firestore, 'users', user.uid);

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    await setDoc(userDocRef, {
      email: user.email,
      displayName: `${firstName} ${lastName}`,
      subscriptionStatus: 'trial',
      trialEnds: trialEnds,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  } catch (error: any) {
    let message = 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'This email address is already in use.';
    } else if (error.code === 'auth/weak-password') {
      message = 'The password is too weak. Please use at least 6 characters.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    }
    console.error('Signup Error:', error.code, error.message);
    return { type: 'error', message };
  }

  redirect('/dashboard');
}
