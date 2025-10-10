'use server';

import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { redirect } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { getFirestore, setDoc, doc } from 'firebase/firestore';

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

    // Update the user's profile with their name
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    });
    
    // Create a new document in the 'users' collection with the user's UID
    const userDocRef = doc(firestore, 'users', user.uid);

    // Set the user's profile data in the document
    await setDoc(userDocRef, {
      email: user.email,
      displayName: `${firstName} ${lastName}`,
      subscriptionStatus: 'trial',
      trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      createdAt: new Date(),
    });

  } catch (error: any) {
    let message = 'An unexpected error occurred. Please try again.';
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

  // Redirect to the dashboard on successful signup and profile creation
  redirect('/dashboard');
}
