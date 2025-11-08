// src/lib/user-access.ts
// Helper functions for checking user access and role

export type UserRole = 'trial' | 'subscribed' | 'expired';

export interface UserDoc {
  id?: string;
  email?: string;
  name?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole | string;
  trial?: {
    startDate?: any; // Firestore Timestamp | Date | string
    endDate?: any; // Firestore Timestamp | Date | string
    isActive?: boolean;
  };
  subscription?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: any; // Firestore Timestamp | Date | string
    status?: 'active' | 'canceled' | 'incomplete' | null;
  };
  // Legacy fields for backward compatibility
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'none' | string;
  trialEnds?: any;
  createdAt?: any;
}

/**
 * Converts a Firestore Timestamp or Date to a JavaScript Date
 */
function toDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue?.toDate === 'function') return dateValue.toDate();
  if (typeof dateValue === 'string') return new Date(dateValue);
  if (typeof dateValue === 'number') return new Date(dateValue);
  return null;
}

/**
 * Checks user access and returns the current access level
 * @param user - User document from Firestore
 * @returns 'subscribed' | 'trial' | 'expired'
 */
export function checkUserAccess(user: UserDoc | null | undefined): UserRole | null {
  if (!user) return null;

  // Check if user has active subscription
  if (user.role === 'subscribed' && user.subscription?.status === 'active') {
    const periodEnd = toDate(user.subscription.currentPeriodEnd);
    if (periodEnd && periodEnd > new Date()) {
      return 'subscribed';
    }
    // Subscription expired
    return 'expired';
  }

  // Check if user is on trial
  if (user.role === 'trial' && user.trial?.isActive) {
    const trialEnd = toDate(user.trial.endDate);
    if (trialEnd && trialEnd > new Date()) {
      return 'trial';
    }
    // Trial expired
    return 'expired';
  }

  // Legacy support: check old subscriptionStatus field
  if (user.subscriptionStatus === 'active') {
    return 'subscribed';
  }

  if (user.subscriptionStatus === 'trial') {
    const trialEnd = toDate(user.trialEnds);
    if (trialEnd && trialEnd > new Date()) {
      return 'trial';
    }
    return 'expired';
  }

  // Default to expired
  return 'expired';
}

/**
 * Gets the number of days left in trial
 */
export function getTrialDaysLeft(user: UserDoc | null | undefined): number {
  if (!user) return 0;

  // New structure
  if (user.trial?.endDate) {
    const trialEnd = toDate(user.trial.endDate);
    if (trialEnd) {
      const diff = trialEnd.getTime() - Date.now();
      const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
      return days > 0 ? days : 0;
    }
  }

  // Legacy support
  if (user.trialEnds) {
    const trialEnd = toDate(user.trialEnds);
    if (trialEnd) {
      const diff = trialEnd.getTime() - Date.now();
      const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
      return days > 0 ? days : 0;
    }
  }

  return 0;
}

