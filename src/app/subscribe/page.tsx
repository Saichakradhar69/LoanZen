'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, Check, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type UserProfile = {
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'none' | string;
  trialEnds?: any;
};

export default function SubscribePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Redirect if already subscribed (active)
  useEffect(() => {
    if (!isProfileLoading && userProfile?.subscriptionStatus === 'active') {
      router.push('/dashboard');
    }
  }, [userProfile, isProfileLoading, router]);

  const handleSubscribe = async () => {
    if (!user || !user.email) {
      toast({
        title: 'Error',
        description: 'Please log in to subscribe.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingCheckout(true);

    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid, 
          userEmail: user.email 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout creation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payment session. Please try again.',
        variant: 'destructive',
      });
      setIsCreatingCheckout(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (userProfile?.subscriptionStatus === 'active') {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-2xl w-full space-y-8">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Your Free Trial Has Ended</CardTitle>
            <CardDescription className="text-lg">
              Subscribe to continue using LoanZen Pro and access all premium features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pricing Card */}
            <div className="text-center space-y-2">
              <div className="text-5xl font-bold">$9.99</div>
              <div className="text-muted-foreground">per month</div>
            </div>

            {/* Features List */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Everything in One-Time</div>
                  <div className="text-sm text-muted-foreground">All the features from the one-time purchase</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Save & Track Unlimited Loans</div>
                  <div className="text-sm text-muted-foreground">Manage all your loans in one place</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">AI Prepayment Advisor</div>
                  <div className="text-sm text-muted-foreground">Get personalized advice on loan prepayments</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Secure Account Login</div>
                  <div className="text-sm text-muted-foreground">Your data is safe and secure</div>
                </div>
              </div>
            </div>

            {/* Subscribe Button */}
            <Button
              onClick={handleSubscribe}
              className="w-full h-12 text-lg"
              size="lg"
              disabled={isCreatingCheckout}
            >
              {isCreatingCheckout ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Subscribe for $9.99/month
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Cancel anytime. No hidden fees.
            </p>
          </CardContent>
        </Card>

        {/* Back to Dashboard Link */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

