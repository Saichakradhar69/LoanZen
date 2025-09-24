
// src/app/existing-loan/actions.ts
'use server';

import { z } from 'zod';
import { performExistingLoanCalculations } from './calculations';
import type { ExistingLoanFormData } from './form';

export type Transaction = {
    date: string;
    type: 'disbursement' | 'repayment' | 'interest';
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
    emiAmount?: number;
    projectedTotalInterest: number;
}

const disbursementSchema = z.object({
  date: z.coerce.date({ required_error: 'Disbursement date is required.' }),
  amount: z.coerce.number().positive('Amount must be positive.'),
});

const rateChangeSchema = z.object({
  date: z.coerce.date({ required_error: 'Effective date is required.' }),
  rate: z.coerce.number().positive('Rate must be positive.').max(100, "Rate seems too high."),
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
    emiAmount: z.coerce.number().optional(),
    paymentDueDay: z.coerce.number().min(1).max(31).optional(),
    moratoriumPeriod: z.coerce.number().min(0, 'Moratorium period cannot be negative.').optional(),
    moratoriumInterestType: z.enum(['none', 'simple', 'partial', 'fixed']).optional(),
    moratoriumPaymentAmount: z.coerce.number().optional(),
    disbursements: z.array(disbursementSchema).optional(),
    rateChanges: z.array(rateChangeSchema).optional(),
    emisPaid: z.coerce.number().min(0, "EMI periods passed cannot be negative.").optional(),
    missedEmis: z.coerce.number().min(0, "Missed EMIs cannot be negative.").optional(),
}).superRefine((data, ctx) => {
    // For standard loans, require original amount OR disbursements, plus EMI details.
    if (['personal', 'car', 'home'].includes(data.loanType)) {
        if ((!data.originalLoanAmount || data.originalLoanAmount <= 0) && (!data.disbursements || data.disbursements.length === 0)) {
            // This is now a soft requirement. If disbursements are provided, original amount is not needed.
            // No issue added here, but the logic in the form should guide the user.
        }
        if (!data.emiAmount || data.emiAmount <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Monthly Payment (EMI) Amount is required for this loan type.",
                path: ["emiAmount"],
            });
        }
        if (data.emisPaid === undefined || data.emisPaid < 0) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Number of EMIs Already Paid is required for this loan type.",
                path: ["emisPaid"],
            });
        }
    }

    // For education loans, require original amount OR disbursements.
    if (data.loanType === 'education' && (!data.originalLoanAmount || data.originalLoanAmount <= 0) && (!data.disbursements || data.disbursements.length === 0)) {
         // This is now a soft requirement.
    }
    
    if (data.loanType === 'education' && (data.moratoriumInterestType === 'partial' || data.moratoriumInterestType === 'fixed') && (!data.moratoriumPaymentAmount || data.moratoriumPaymentAmount <= 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A payment amount is required for this moratorium type.",
            path: ["moratoriumPaymentAmount"],
        });
    }

    if (data.missedEmis && data.emisPaid !== undefined && data.missedEmis > data.emisPaid) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Missed EMIs cannot be greater than total EMIs paid.",
            path: ["missedEmis"],
        });
    }
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
