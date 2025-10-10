
'use client';

import {
  useFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useAuth,
  useFirestore,
  useFirebaseApp
} from './provider';

// This file should only export client-side functionality
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
