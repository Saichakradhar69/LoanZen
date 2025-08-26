// src/app/calculator/page.tsx
'use client';

import { Suspense, useState } from 'react';
import CalculatorForm from './form';
import CalculatorResults from './results';
import type { FormData } from './form';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export type AmortizationData = {
  month: number;
  monthlyPayment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

export type ScenarioResult = {
  scenarioName: string;
  totalInterest: number;
  totalPayment: number;
  monthlyPayment: number;
  amortizationSchedule: AmortizationData[];
  loanAmount: number;
};

export type CalculationResults = {
  loanName: string;
  loanType: string;
  interestRateType: string;
  scenarios: ScenarioResult[];
}

function calculateAmortization(loanAmount: number, annualInterestRate: number, loanTermYears: number) {
  const monthlyInterestRate = annualInterestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;

  const monthlyPayment =
    (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

  let remainingBalance = loanAmount;
  let totalInterest = 0;
  const amortizationSchedule: AmortizationData[] = [];

  for (let month = 1; month <= numberOfPayments; month++) {
    const interest = remainingBalance * monthlyInterestRate;
    const principal = monthlyPayment - interest;
    remainingBalance -= principal;
    totalInterest += interest;

    amortizationSchedule.push({
      month,
      monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
      principal: parseFloat(principal.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      remainingBalance: parseFloat(Math.abs(remainingBalance).toFixed(2)),
    });
  }

  return {
    monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    totalPayment: parseFloat((loanAmount + totalInterest).toFixed(2)),
    amortizationSchedule,
  };
}

function CalculatorContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const [results, setResults] = useState<CalculationResults | null>(null);

  const handleCalculation = (data: FormData) => {
    const calculatedScenarios = data.scenarios.map((scenario) => {
      const { monthlyPayment, totalInterest, totalPayment, amortizationSchedule } = calculateAmortization(
        scenario.loanAmount,
        scenario.interestRate,
        scenario.loanTerm
      );
      return {
        scenarioName: scenario.scenarioName,
        totalInterest,
        totalPayment,
        monthlyPayment,
        amortizationSchedule,
        loanAmount: scenario.loanAmount,
      };
    });
    setResults({
      loanName: data.loanName,
      loanType: data.loanType,
      interestRateType: data.interestRateType,
      scenarios: calculatedScenarios
    });
  };
  
  const handleBack = () => {
    setResults(null);
     // Clear the status from the URL to hide the alert
    window.history.replaceState(null, '', '/calculator');
  };


  return (
    <div className="container mx-auto max-w-5xl py-12 px-4">
      {status === 'cancelled' && (
         <Alert variant="destructive" className="mb-8">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Payment Cancelled</AlertTitle>
            <AlertDescription>
                Your payment was not processed. You can try again at any time.
            </AlertDescription>
        </Alert>
      )}
      <div className="text-center mb-10">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Loan Comparison Calculator
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Compare different loan scenarios to find the best option for you.
        </p>
      </div>

      {!results ? (
        <CalculatorForm onCalculate={handleCalculation} />
      ) : (
        <CalculatorResults results={results} onBack={handleBack}/>
      )}
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CalculatorContent />
    </Suspense>
  )
}
