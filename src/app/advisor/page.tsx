// src/app/advisor/page.tsx
'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { checkUserAccess, type UserDoc } from '@/lib/user-access';
import Chat from './Chat';

export default function PrepaymentAdvisorPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserDoc>(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/advisor');
    }
  }, [user, isUserLoading, router]);

  // Check trial expiration and redirect to subscribe page if expired
  useEffect(() => {
    if (!isProfileLoading && userProfile && user) {
      const access = checkUserAccess(userProfile);
      
      // If user has access (trial or subscribed), allow access
      if (access === 'trial' || access === 'subscribed') {
        return;
      }
      
      // If expired or no access, redirect to subscribe
      if (access === 'expired' || !access) {
        router.push('/subscribe');
      }
    }
  }, [userProfile, isProfileLoading, user, router]);

  // No server call needed to create chat; client will ensure document exists

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4 flex-grow flex flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground">Starting your advisor session...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="container mx-auto max-w-4xl py-12 px-4 flex-grow flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-destructive">Error</h2>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">Please try refreshing the page.</p>
      </div>
    );
  }
  
  if (!user) {
    return null; // or some other placeholder
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
       <div className="text-center py-6 border-b">
         <h1 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
           AI Prepayment Advisor
         </h1>
         <p className="mt-2 text-md leading-8 text-muted-foreground max-w-2xl mx-auto">
           Chat with your personal AI to analyze your loans and find the best repayment strategy.
         </p>
       </div>
      <Chat />
    </div>
  );
}
