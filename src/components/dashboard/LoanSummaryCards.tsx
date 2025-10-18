'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Loan {
  id: string;
  loanName: string;
  loanType: string;
  originalLoanAmount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  disbursementDate?: Date;
  emisPaid?: number;
}

const loanTypeIcons: { [key: string]: string } = {
  'personal': '💳',
  'car': '🚗',
  'student': '🎓',
  'mortgage': '🏠',
  'credit-card': '💳',
  'other': '📄'
};

export default function LoanSummaryCards() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    const fetchLoans = async () => {
      if (!user) return;

      try {
        const loansQuery = query(
          collection(firestore, 'users', user.uid, 'loans')
        );
        const querySnapshot = await getDocs(loansQuery);
        
        const loansData: Loan[] = [];
        querySnapshot.forEach((doc) => {
          loansData.push({ id: doc.id, ...doc.data() } as Loan);
        });
        
        setLoans(loansData);
      } catch (error) {
        console.error('Error fetching loans:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoans();
  }, [firestore, user]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">...</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalDebt = loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  const totalMonthlyPayments = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
  const highestInterestRate = loans.length > 0 ? Math.max(...loans.map(loan => loan.interestRate)) : 0;
  const loanCount = loans.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDebt.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {loanCount} loan{loanCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payments</CardTitle>
            <span className="text-2xl">📅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyPayments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total monthly obligation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Interest</CardTitle>
            <span className="text-2xl">📈</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highestInterestRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {highestInterestRate > 0 ? 'Consider paying this first' : 'No loans yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Number of Loans</CardTitle>
            <span className="text-2xl">📋</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanCount}</div>
            <p className="text-xs text-muted-foreground">
              {loanCount === 0 ? 'Add your first loan' : 'Active loans'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Loan Cards */}
      {loans.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Loans</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {loans.map((loan) => (
              <Card key={loan.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{loanTypeIcons[loan.loanType] || '📄'}</span>
                    {loan.loanName}
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {loan.loanType.replace('-', ' ')} Loan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Current Balance:</span>
                      <span className="font-semibold">${loan.currentBalance?.toLocaleString() || 'Calculating...'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Original Amount:</span>
                      <span className="font-semibold">${loan.originalLoanAmount?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Interest Rate:</span>
                      <span className="font-semibold">{loan.interestRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Payment:</span>
                      <span className="font-semibold">${loan.monthlyPayment.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loans.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Loans Yet</CardTitle>
            <CardDescription>
              Add your first loan to get started with LoanZen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click the "Add Loan" button to get started with tracking your loans.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
