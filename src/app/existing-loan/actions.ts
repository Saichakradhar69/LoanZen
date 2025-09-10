
// src/app/existing-loan/actions.ts
'use server';

import { z } from 'zod';
import { performExistingLoanCalculations } from './calculations';
import type { ExistingLoanFormData } from './form';

export type Transaction = {
    date: string;
    type: 'disbursement' | 'repayment' | 'withdrawal' | 'interest' | 'rate-change';
    amount: number;
    principal: number;
    interest: number;
    endingBalance: number;
    note?: string;
}

export type CalculationResult = {
    outstandingBalance: number;
    interestPaidToDate: number;
    nextEmiDate: string | null;
    originalLoanAmount: number;
    loanName: string | undefined;
    loanType: string;
    interestType: 'reducing' | 'flat';
    schedule: Transaction[];
}

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

// This schema is used for server-side validation.
const formSchema = z.object({
    loanType: z.string({ required_error: 'Please select a loan type.' }),
    loanName: z.string().optional(),
    originalLoanAmount: z.coerce.number().positive('Original loan amount is required.'),
    disbursementDate: z.date({ required_error: 'Disbursement date is required.' }),
    interestRate: z.coerce.number().positive('Interest rate must be positive.').max(100, "Rate seems too high."),
    interestType: z.enum(['reducing', 'flat']),
    rateType: z.enum(['fixed', 'floating']),
    paymentStructure: z.enum(['fixed', 'variable']).optional(),
    emiAmount: z.coerce.number().optional().default(0),
    moratoriumPeriod: z.coerce.number().min(0, 'Moratorium period cannot be negative.').optional().default(0),
    disbursements: z.array(disbursementSchema).optional(),
    rateChanges: z.array(rateChangeSchema).optional(),
    transactions: z.array(transactionSchema).optional(),
    emisPaid: z.coerce.number().min(0, "EMIs paid cannot be negative.").optional().default(0)
});


export async function calculateOutstandingBalanceAction(
  prevState: any,
  data: ExistingLoanFormData | null,
) {
    if (!data) {
        return null;
    }
    
    const validatedFields = formSchema.safeParse(data);
    
    if (!validatedFields.success) {
      return {
        type: 'error',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    try {
        const result = performExistingLoanCalculations(validatedFields.data as ExistingLoanFormData);
        return {
            type: 'success',
            data: result
        };
    } catch (error) {
        console.error("Calculation Error:", error);
         return {
            type: 'error',
            errors: { _global: ['An unexpected error occurred during calculation. Please check your inputs.'] },
        };
    }
}
