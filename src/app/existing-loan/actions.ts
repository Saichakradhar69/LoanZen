
// src/app/existing-loan/actions.ts
'use server';

import { z } from 'zod';
import { calculateFlatRate, calculateReducingBalance } from './calculations';

const disbursementSchema = z.object({
  date: z.date({ required_error: 'Disbursement date is required.' }),
  amount: z.coerce.number().positive('Amount must be positive.'),
});

const rateChangeSchema = z.object({
  date: z.date({ required_error: 'Effective date is required.' }),
  rate: z.coerce.number().positive('Rate must be positive.').max(100, "Rate seems too high."),
});

const transactionSchema = z.object({
    date: z.date({ required_error: 'Transaction date is required.' }),
    type: z.enum(['withdrawal', 'repayment']),
    amount: z.coerce.number().positive('Amount must be positive.')
});

const formSchema = z.object({
    loanType: z.string({ required_error: 'Please select a loan type.' }),
    originalLoanAmount: z.coerce.number().positive('Original loan amount is required.'),
    disbursementDate: z.date({ required_error: 'Disbursement date is required.' }),
    interestRate: z.coerce.number().positive('Interest rate must be positive.').max(100, "Rate seems too high."),
    interestType: z.enum(['reducing', 'flat']),
    rateType: z.enum(['fixed', 'floating']),
    emiAmount: z.coerce.number().optional(),
    moratoriumPeriod: z.coerce.number().min(0, 'Moratorium period cannot be negative.').optional(),
    disbursements: z.array(disbursementSchema).optional(),
    rateChanges: z.array(rateChangeSchema).optional(),
    transactions: z.array(transactionSchema).optional(),
    emisPaid: z.coerce.number().min(0, "EMIs paid cannot be negative.").optional()
});


export async function calculateOutstandingBalanceAction(
  prevState: any,
  formData: FormData,
) {
    // This is a placeholder for the real calculation logic which is complex.
    // For now, we will just validate the input and return a success message.

    // WARNING: A full implementation requires a detailed, date-aware, day-by-day 
    // calculation loop, especially for floating rates and credit lines. 
    // The functions in `calculations.ts` are simplified for this example.

    const validatedFields = formSchema.safeParse({
      loanType: formData.get('loanType'),
      originalLoanAmount: formData.get('originalLoanAmount'),
      disbursementDate: new Date(formData.get('disbursementDate') as string),
      interestRate: formData.get('interestRate'),
      interestType: formData.get('interestType'),
      rateType: formData.get('rateType'),
      // ... and so on for all fields
    });
    
    // This is a simplified validation for demonstration.
    // A real implementation would need to parse all fields from formData.
    if (formData.get('originalLoanAmount') === '0') {
         return {
            type: 'error',
            errors: { originalLoanAmount: ['Loan amount must be greater than 0.'] },
        };
    }

    console.log("Form data received on server:", Object.fromEntries(formData.entries()));

    // Here you would call your complex calculation logic based on interestType
    // e.g. if (validatedFields.data.interestType === 'flat') { ... }

    return {
        type: 'success',
        data: {
            outstandingBalance: 12345.67, // Dummy data
            interestPaidToDate: 2345.67, // Dummy data
            nextEmiDate: new Date().toISOString(), // Dummy data
        }
    };
}
