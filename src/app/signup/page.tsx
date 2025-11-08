'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { Loader2, CheckCircle, Gift } from 'lucide-react';

export default function SignupPage() {
  const [step, setStep] = useState<'signup' | 'coupon'>('signup');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [couponCode, setCouponCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [error, setError] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Update the user's display name
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      // Store user info for coupon/payment step
      setUserId(user.uid);
      setUserEmail(user.email || null);

      // Create user document in Firestore with new structure
      // Note: The 'id' field is required by Firestore security rules and must match the userId
      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid, // Required by Firestore security rules
        email: user.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        name: `${formData.firstName} ${formData.lastName}`,
        role: 'trial', // Will be set to 'subscribed' after payment
        trial: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          isActive: true,
        },
        subscription: null, // Will be set after Stripe subscription
        createdAt: new Date(),
      });

      // Move to coupon code step
      setStep('coupon');
    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMessage = 'An error occurred during signup. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please use the login page.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCouponValidation = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code or skip to continue');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await fetch('/api/subscription/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: couponCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate coupon');
      }

      if (data.valid) {
        // Apply free trial - user already has trial structure from signup
        // Just ensure trial is active and update coupon used
        if (userId && firestore) {
          await setDoc(doc(firestore, 'users', userId), {
            role: 'trial',
            'trial.isActive': true,
            couponUsed: couponCode.toUpperCase().trim(),
          }, { merge: true });

          // Redirect to dashboard with trial
          router.push('/dashboard');
        }
      } else {
        setCouponError(data.message || 'Invalid coupon code');
      }
    } catch (error: any) {
      console.error('Coupon validation error:', error);
      setCouponError(error.message || 'Failed to validate coupon. Please try again.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleSkipToPayment = async () => {
    if (!userId || !userEmail) {
      setCouponError('User information is missing. Please try signing up again.');
      return;
    }

    setIsCreatingCheckout(true);
    setCouponError('');

    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userEmail }),
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
      setCouponError(error.message || 'Failed to create payment session. Please try again.');
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Render coupon code step
  if (step === 'coupon') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Account Created!</CardTitle>
              <CardDescription>
                Enter a coupon code for a free trial, or proceed with payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="couponCode" className="flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Coupon Code (Optional)
                </Label>
                <Input
                  id="couponCode"
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError('');
                  }}
                  placeholder="Enter coupon code"
                  className="mt-1"
                  disabled={isValidatingCoupon || isCreatingCheckout}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Have a coupon code? Enter it to get a free trial
                </p>
              </div>

              {couponError && (
                <div className={`text-sm p-3 rounded-md ${
                  couponError.includes('valid') || couponError.includes('Invalid') 
                    ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                    : 'text-red-600 bg-red-50 dark:bg-red-900/20'
                }`}>
                  {couponError}
                </div>
              )}

              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleCouponValidation}
                  className="w-full"
                  disabled={!couponCode.trim() || isValidatingCoupon || isCreatingCheckout}
                >
                  {isValidatingCoupon ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Apply Coupon Code
                    </>
                  )}
                </Button>

                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="px-4 text-sm text-muted-foreground">OR</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>

                <Button
                  type="button"
                  variant="default"
                  onClick={handleSkipToPayment}
                  className="w-full"
                  disabled={isValidatingCoupon || isCreatingCheckout}
                >
                  {isCreatingCheckout ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Subscribe for $9.99/month
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render signup form
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>
              Enter your information to get started with LoanZen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your password"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  placeholder="Confirm your password"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                  {error.includes('already registered') && (
                    <div className="mt-2">
                      <Link href="/login" className="text-blue-600 hover:text-blue-800 underline">
                        Click here to login instead
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}