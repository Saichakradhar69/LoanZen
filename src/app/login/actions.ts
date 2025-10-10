'use server';

import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { redirect } from 'next/navigation';
import { initializeFirebase } from "@/firebase";

export async function loginAction(
  prevState: any,
  formData: FormData,
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  try {
    const { auth } = initializeFirebase();
    await signInWithEmailAndPassword(auth, email, password);
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
