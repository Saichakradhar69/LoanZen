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
    const { auth, firestore } = initializeFirebase();

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    });

    const userDocRef = doc(firestore, 'users', user.uid);

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    // Use the non-blocking set operation and let the error boundary catch issues
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
    // Provide more specific feedback based on the Firebase error code.
    if (error.code === 'auth/email-already-in-use') {
      message = 'This email address is already in use by another account.';
    } else if (error.code === 'auth/weak-password') {
      message = 'The password is too weak. It must be at least 6 characters long.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'The email address is not valid.';
    }
    console.error('Signup Error:', error.code, error.message);
    return { type: 'error', message };
  }

  redirect('/dashboard');
}
