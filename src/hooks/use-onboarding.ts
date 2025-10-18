'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useOnboarding() {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (isUserLoading) {
        return;
      }

      if (!user) {
        setNeedsOnboarding(null);
        setIsLoading(false);
        return;
      }

      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setNeedsOnboarding(!userData.isOnboarded);
        } else {
          // User document doesn't exist, they need onboarding
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setNeedsOnboarding(true); // Default to needing onboarding on error
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, isUserLoading, firestore]);

  return {
    needsOnboarding,
    isLoading: isLoading || isUserLoading
  };
}
