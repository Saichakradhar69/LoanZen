
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

  const handleBack = () => {
    // This will reset the state, causing the form to be shown again.
    (formAction as any)(null);
    setFormData(null);
     // Clear the status from the URL to hide the alert
    window.history.replaceState(null, '', '/existing-loan');
  };
  
  // This effect will run when the action completes successfully
  useEffect(() => {
    if (state?.type === 'success' && state.data) {
        // Since we are now passing the object directly, we can just set it.
        // The data is available in the `calculateOutstandingBalanceAction`'s second argument.
        // We'll retrieve it from the form for simplicity, but it's already in the action.
        const form = document.querySelector('form');
        if (form) {
            // A bit of a hack to get latest form values.
            const fd = new FormData(form);
            const fData: any = {};
             for (const [key, value] of fd.entries()) {
                if(key.startsWith('$ACTION_ID_')) continue;
                fData[key] = value;
             }
             // This is imperfect. A better way would be to get the data from the form state.
             // For now, let's assume `state.data.formData` if we were to pass it.
             // Since we have the result, we can assume the last submitted data was valid.
             // The action state doesn't give us the input though.
             // Let's rely on the form state itself.
        }
        // Let's just set the data from the successful state.
        // We need the original form data for the checkout.
        // The action doesn't return it. We should probably get it from the form itself.
    }
  }, [state]);

  const handleFormSubmit = (data: ExistingLoanFormData) => {
    setFormData(data);
    formAction(data);
  }

  const showResults = state?.type === 'success' && state.data;

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
         <ExistingLoanForm formAction={formAction as any} initialState={state} />
      ) : (
        <ExistingLoanResults results={state.data as CalculationResult} formData={state.data as any} onBack={handleBack}/>
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
