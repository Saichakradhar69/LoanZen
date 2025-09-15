
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
    interestRate: number;
    perDayInterest: number;
    schedule: Transaction[];
}

const disbursementSchema = z.object({
  date: z.coerce.date({ required_error: 'Disbursement date is required.' }),
  amount: z.coerce.number().positive('Amount must be positive.'),
});

const rateChangeSchema = z.object({
  date: z.coerce.date({ required_error: 'Effective date is required.' }),
  rate: z.coerce.number().positive('Rate must be positive.').max(100, "Rate seems too high."),
});

const transactionSchema = z.object({
    date: z.coerce.date({ required_error: 'Transaction date is required.' }),
    type: z.enum(['withdrawal', 'repayment']),
    amount: z.coerce.number().positive('Amount must be positive.')
});

// This schema is used for server-side validation.
const formSchema = z.object({
    loanType: z.string({ required_error: 'Please select a loan type.' }),
    loanName: z.string().optional(),
    originalLoanAmount: z.coerce.number().optional(),
    disbursementDate: z.coerce.date({ required_error: 'Disbursement date is required.' }),
    interestRate: z.coerce.number().positive('Interest rate must be positive.').max(100, "Rate seems too high."),
    interestType: z.enum(['reducing', 'flat']),
    rateType: z.enum(['fixed', 'floating']),
    paymentStructure: z.enum(['fixed', 'variable']).optional(),
    emiAmount: z.coerce.number().optional(),
    paymentDueDay: z.coerce.number().min(1).max(31).optional(),
    moratoriumPeriod: z.coerce.number().min(0, 'Moratorium period cannot be negative.').optional(),
    disbursements: z.array(disbursementSchema).optional(),
    rateChanges: z.array(rateChangeSchema).optional(),
    transactions: z.array(transactionSchema).optional(),
    emisPaid: z.coerce.number().min(0, "EMIs paid cannot be negative.").optional()
}).refine(data => {
    if (data.loanType === 'education' && data.disbursements && data.disbursements.length > 0) return true;
    if (data.loanType === 'credit-line') return true;
    return data.originalLoanAmount && data.originalLoanAmount > 0;
}, {
    message: "Original loan amount is required unless you are providing multiple disbursements.",
    path: ["originalLoanAmount"],
});


export async function calculateOutstandingBalanceAction(
  prevState: any,
  formData: FormData,
) {
    // This is called with empty FormData to reset the state, so we handle it gracefully.
    if (!formData.has('form_data_json')) {
        return { type: 'initial' };
    }

    const jsonString = formData.get('form_data_json') as string;
    const data = JSON.parse(jsonString);
    
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
            data: {
                ...result,
                formData: validatedFields.data // Pass validated data for checkout
            }
        };
    } catch (error) {
        console.error("Calculation Error:", error);
         return {
            type: 'error',
            errors: { _global: ['An unexpected error occurred during calculation. Please check your inputs.'] },
        };
    }
}
