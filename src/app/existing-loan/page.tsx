
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
    (formAction as any)(new FormData()); // A bit of a hack to reset the action state
    setFormData(null);
     // Clear the status from the URL to hide the alert
    window.history.replaceState(null, '', '/existing-loan');
  };
  
  // This effect will run when the action completes successfully
  useEffect(() => {
    if (state?.type === 'success' && state.data) {
        const form = document.querySelector('form');
        if (form) {
            const fd = new FormData(form);
            const fData: any = {};
            for (const [key, value] of fd.entries()) {
                if(key.startsWith('$ACTION_ID_')) continue;

                if (key.endsWith('Date')) {
                    fData[key] = new Date(value as string);
                } else if (['disbursements', 'rateChanges', 'transactions'].includes(key)) {
                    fData[key] = JSON.parse(value as string).map((item: any) => ({
                        ...item,
                        date: new Date(item.date)
                    }));
                } else if (value && typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(Number(value))) {
                     fData[key] = parseFloat(value);
                } else {
                     fData[key] = value;
                }
            }
             setFormData(fData);
        }
    }
  }, [state]);

  const showResults = state?.type === 'success' && state.data && formData;

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
       {status === 'cancelled' && (
         <Alert variant="destructive" className="mb-8">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Payment Cancelled</AlertTitle>
            <AlertDescription>
                Your payment was not processed. You can try again at any time.
            </Aler tDescription>
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
         <ExistingLoanForm formAction={formAction} state={state} />
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
