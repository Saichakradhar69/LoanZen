'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { calculateCurrentBalance } from '@/utils/loan-calculations';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LoanData {
  loanName: string;
  loanType: string;
  originalLoanAmount: number;
  disbursementDate: Date;
  interestRate: number;
  monthlyPayment: number;
  emisPaid: number;
}

const loanTypes = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'student', label: 'Student Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'other', label: 'Other' }
];

export default function LoanOnboardingForm() {
  const [formData, setFormData] = useState<LoanData>({
    loanName: '',
    loanType: '',
    originalLoanAmount: 0,
    disbursementDate: new Date(),
    interestRate: 0,
    monthlyPayment: 0,
    emisPaid: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const handleInputChange = (field: keyof LoanData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!formData.loanName.trim()) {
      setError('Please enter a loan name');
      setIsLoading(false);
      return;
    }

    if (!formData.loanType) {
      setError('Please select a loan type');
      setIsLoading(false);
      return;
    }

    if (formData.originalLoanAmount <= 0) {
      setError('Please enter a valid original loan amount');
      setIsLoading(false);
      return;
    }

    if (formData.emisPaid < 0) {
      setError('Number of EMIs paid cannot be negative');
      setIsLoading(false);
      return;
    }

    if (formData.interestRate < 0 || formData.interestRate > 100) {
      setError('Please enter a valid interest rate (0-100%)');
      setIsLoading(false);
      return;
    }

    if (formData.monthlyPayment <= 0) {
      setError('Please enter a valid monthly payment');
      setIsLoading(false);
      return;
    }

    try {
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Calculate current balance using the loan calculation logic
      const currentBalance = calculateCurrentBalance({
        originalLoanAmount: formData.originalLoanAmount,
        disbursementDate: formData.disbursementDate,
        interestRate: formData.interestRate,
        emiAmount: formData.monthlyPayment,
        emisPaid: formData.emisPaid,
        paymentDueDay: 1
      });

      // Create loan document
      const loanId = `loan_${Date.now()}`;
      const loanData = {
        ...formData,
        currentBalance: currentBalance,
        id: loanId,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save loan to Firestore
      await setDoc(doc(firestore, 'users', user.uid, 'loans', loanId), loanData);

      // Mark user as onboarded
      await setDoc(doc(firestore, 'users', user.uid), {
        isOnboarded: true,
        onboardedAt: new Date()
      }, { merge: true });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      setError('Failed to save loan information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome to LoanZen!</CardTitle>
            <CardDescription>
              Let's start by adding your first loan. We'll calculate your current balance automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="loanName">Loan Name</Label>
                <Input
                  id="loanName"
                  value={formData.loanName}
                  onChange={(e) => handleInputChange('loanName', e.target.value)}
                  placeholder="e.g., Car Loan, Student Loan"
                  required
                />
              </div>

              <div>
                <Label htmlFor="loanType">Loan Type</Label>
                <Select value={formData.loanType} onValueChange={(value) => handleInputChange('loanType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    {loanTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="originalLoanAmount">Original Loan Amount</Label>
                <Input
                  id="originalLoanAmount"
                  type="number"
                  value={formData.originalLoanAmount || ''}
                  onChange={(e) => handleInputChange('originalLoanAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="disbursementDate">Loan Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.disbursementDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.disbursementDate ? format(formData.disbursementDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.disbursementDate}
                      onSelect={(date) => date && handleInputChange('disbursementDate', date)}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="emisPaid">Number of EMIs Paid</Label>
                <Input
                  id="emisPaid"
                  type="number"
                  value={formData.emisPaid || ''}
                  onChange={(e) => handleInputChange('emisPaid', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  value={formData.interestRate || ''}
                  onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="monthlyPayment">Monthly Payment</Label>
                <Input
                  id="monthlyPayment"
                  type="number"
                  value={formData.monthlyPayment || ''}
                  onChange={(e) => handleInputChange('monthlyPayment', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Add My Loan'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                We'll calculate your current balance based on your payments and interest.
              </p>
              <p className="text-sm text-gray-600 mt-1">
                You can add more loans later from your dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
