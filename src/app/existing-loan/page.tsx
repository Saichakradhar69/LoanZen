
'use client';

import { useActionState, useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { calculateOutstandingBalanceAction, CalculationResult } from './actions';
import ExistingLoanForm from './form';
import ExistingLoanResults from './results';
import type { ExistingLoanFormData } from './form';

function ExistingLoanContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const [state, formAction] = useActionState(calculateOutstandingBalanceAction, null);
  const [formData, setFormData] = useState<ExistingLoanFormData | null>(null);

  useEffect(() => {
    if (state?.type === 'success' && state.data) {
        // Need to get the form data that led to this success state
        // This is tricky because the server action doesn't have it.
        // A better approach might be to not clear the form, or pass data back.
        // For now, we'll just handle the successful result.
    }
  }, [state]);


  const handleCalculation = (data: ExistingLoanFormData) => {
    // This function will be called by the form on submit.
    // It will then trigger the server action.
    const artificialFormData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
                artificialFormData.append(key, JSON.stringify(value));
            } else if (value instanceof Date) {
                artificialFormData.append(key, value.toISOString());
            } else {
                artificialFormData.append(key, String(value));
            }
        }
    });
    setFormData(data);
    formAction(artificialFormData);
  };
  
  const handleBack = () => {
    // This will reset the state, causing the form to be shown again.
    (formAction as any)(null); // A bit of a hack to reset the action state
    setFormData(null);
     // Clear the status from the URL to hide the alert
    window.history.replaceState(null, '', '/existing-loan');
  };

  const showResults = state?.type === 'success' && state.data && formData;

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
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
          Check Your Existing Loan
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Provide your loan details to get an accurate, up-to-date statement of your outstanding balance.
        </p>
      </div>
      
      {!showResults ? (
         <ExistingLoanForm formAction={handleCalculation} state={state} />
      ) : (
        <ExistingLoanResults results={state.data as CalculationResult} formData={formData} onBack={handleBack}/>
      )}

    </div>
  );
}


export default function ExistingLoanPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ExistingLoanContent />
        </Suspense>
    )
}
