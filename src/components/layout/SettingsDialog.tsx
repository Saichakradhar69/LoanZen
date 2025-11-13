'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { useCurrency, type Currency } from '@/contexts/currency-context';
import { 
  Mail, 
  CreditCard, 
  Shield, 
  HelpCircle, 
  DollarSign, 
  CheckCircle2, 
  XCircle,
  Key,
  Trash2,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { currency, setCurrency } = useCurrency();
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);

  // Check email verification status
  const isEmailVerified = user?.emailVerified || false;

  const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'INR'];
  
  const currencyLabels: Record<Currency, string> = {
    USD: 'US Dollar ($)',
    EUR: 'Euro (€)',
    GBP: 'British Pound (£)',
    INR: 'Indian Rupee (₹)',
  };

  const handleCurrencyChange = async (newCurrency: Currency) => {
    if (newCurrency === currency || !user) return;
    
    setIsUpdatingCurrency(true);
    try {
      // Update global currency context
      setCurrency(newCurrency);
      
      // Update all loans in Firestore
      const response = await fetch('/api/loans/update-currency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          currency: newCurrency,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update loans');
      }

      toast({
        title: 'Currency Updated',
        description: `All loans have been updated to ${currencyLabels[newCurrency]}.`,
      });
    } catch (error: any) {
      console.error('Failed to update currency:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update currency. Please try again.',
      });
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!user) return;
    
    // Check if email is already verified
    if (user.emailVerified) {
      toast({
        title: 'Email Already Verified',
        description: 'Your email address is already verified.',
      });
      return;
    }
    
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/dashboard?verified=true`,
        handleCodeInApp: false, // Set to false for email links
      });
      
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your email (including spam folder) and click the verification link.',
      });
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      
      let errorMessage = 'Failed to send verification email. Please try again.';
      
      // Provide more specific error messages
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    
    setIsSendingPasswordReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email, {
        url: `${window.location.origin}/login?reset=true`,
      });
      
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your email for password reset instructions.',
      });
    } catch (error: any) {
      console.error('Failed to send password reset email:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send password reset email. Please try again.',
      });
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    
    setIsManagingSubscription(true);
    try {
      // Get user's Stripe customer ID from Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      
      const customerId = userData?.subscription?.stripeCustomerId;
      
      if (!customerId) {
        toast({
          variant: 'destructive',
          title: 'No Subscription Found',
          description: 'You do not have an active subscription.',
        });
        return;
      }

      // Create Stripe customer portal session
      const response = await fetch('/api/subscription/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          returnUrl: `${window.location.origin}/dashboard`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Provide more specific error messages
        let errorMessage = data.error || 'Failed to create portal session';
        
        if (data.code === 'portal_not_configured') {
          errorMessage = data.details || 'Stripe Customer Portal is not configured. Please save the configuration in Stripe Dashboard.';
          
          // Show a more helpful message with link
          toast({
            variant: 'destructive',
            title: 'Portal Not Configured',
            description: 'Please save your Customer Portal settings in Stripe Dashboard. Click the link in the error details for instructions.',
            duration: 10000,
          });
        } else if (data.details) {
          errorMessage = `${data.error}: ${data.details}`;
        }
        
        throw new Error(errorMessage);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received from server');
      }
    } catch (error: any) {
      console.error('Failed to open customer portal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to open subscription management. Please try again.',
      });
    } finally {
      setIsManagingSubscription(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !deletePassword) {
      toast({
        variant: 'destructive',
        title: 'Password Required',
        description: 'Please enter your password to confirm account deletion.',
      });
      return;
    }

    setIsDeletingAccount(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, deletePassword);
      await reauthenticateWithCredential(user, credential);

      // Call API to delete account and all associated data
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }

      // Delete Firebase Auth user
      await deleteUser(user);

      toast({
        title: 'Account Deleted',
        description: 'Your account and all associated data have been permanently deleted.',
      });

      // Redirect to home page
      router.push('/');
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete account. Please try again.',
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your account settings and preferences.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
          {/* Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Notifications</h3>
            </div>
            <div className="flex items-center justify-between pl-6">
              <Label htmlFor="email-notifications" className="text-sm">Email Notifications</Label>
              <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <div className="flex items-center justify-between pl-6">
              <Label htmlFor="push-notifications" className="text-sm">Push Notifications</Label>
              <Switch id="push-notifications" checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>
          </div>

          <Separator />

          {/* Currency */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Currency</h3>
            </div>
            <div className="pl-6">
              <Label htmlFor="currency-select" className="text-sm mb-2 block">
                Default Currency
              </Label>
              <Select
                value={currency}
                onValueChange={handleCurrencyChange}
                disabled={isUpdatingCurrency}
              >
                <SelectTrigger id="currency-select" className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {currencyLabels[curr]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Changing currency will update all your loans to use the new currency.
              </p>
            </div>
          </div>

          <Separator />

          {/* Account */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Account</h3>
            </div>
            <div className="space-y-3 pl-6">
              <div className="text-sm">
                <p className="text-muted-foreground">Email</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-medium">{user?.email || 'N/A'}</p>
                  {isEmailVerified ? (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs">Not Verified</span>
                    </div>
                  )}
                </div>
                {!isEmailVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleSendVerificationEmail}
                    disabled={isSendingVerification}
                  >
                    {isSendingVerification ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3 mr-2" />
                        Send Verification Email
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Display Name</p>
                <p className="font-medium">{user?.displayName || 'Not set'}</p>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleSendPasswordReset}
                  disabled={isSendingPasswordReset}
                >
                  {isSendingPasswordReset ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Subscription */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Subscription</h3>
            </div>
            <div className="pl-6">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleManageSubscription}
                disabled={isManagingSubscription}
              >
                {isManagingSubscription ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Help */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Support</h3>
            </div>
            <div className="pl-6 space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Help Center
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Account Confirmation Dialog */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account, 
            all your loans, payments, and associated data. Please enter your password to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="delete-password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="delete-password"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Enter your password"
            className="mt-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deletePassword && !isDeletingAccount) {
                handleDeleteAccount();
              }
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeletePassword('')}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount || !deletePassword}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeletingAccount ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Account'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

