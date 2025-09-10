
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

function createObjectFromFormData(formData: FormData): ExistingLoanFormData {
  const data: any = {};
  const disbursements: any[] = [];
  const rateChanges: any[] = [];
  const transactions: any[] = [];

  const disbursementIndices = new Set<string>();
  const rateChangeIndices = new Set<string>();
  const transactionIndices = new Set<string>();

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('$ACTION_ID_')) continue;

    const matchDisbursement = key.match(/disbursements\[(\d+)\]\.(date|amount)/);
    if (matchDisbursement) {
      disbursementIndices.add(matchDisbursement[1]);
      continue;
    }

    const matchRateChange = key.match(/rateChanges\[(\d+)\]\.(date|rate)/);
    if (matchRateChange) {
      rateChangeIndices.add(matchRateChange[1]);
      continue;
    }

    const matchTransaction = key.match(/transactions\[(\d+)\]\.(date|type|amount)/);
    if (matchTransaction) {
      transactionIndices.add(matchTransaction[1]);
      continue;
    }
    
    data[key] = value;
  }
  
  disbursementIndices.forEach(index => {
      const date = formData.get(`disbursements[${index}].date`);
      const amount = formData.get(`disbursements[${index}].amount`);
      if (date && amount) {
        disbursements.push({ date: new Date(date as string), amount: parseFloat(amount as string) });
      }
  });

  rateChangeIndices.forEach(index => {
      const date = formData.get(`rateChanges[${index}].date`);
      const rate = formData.get(`rateChanges[${index}].rate`);
      if (date && rate) {
        rateChanges.push({ date: new Date(date as string), rate: parseFloat(rate as string) });
      }
  });
  
  transactionIndices.forEach(index => {
      const date = formData.get(`transactions[${index}].date`);
      const type = formData.get(`transactions[${index}].type`);
      const amount = formData.get(`transactions[${index}].amount`);
      if(date && type && amount) {
          transactions.push({ date: new Date(date as string), type, amount: parseFloat(amount as string) });
      }
  });


  return {
    ...data,
    originalLoanAmount: parseFloat(data.originalLoanAmount),
    disbursementDate: new Date(data.disbursementDate),
    interestRate: parseFloat(data.interestRate),
    emiAmount: data.emiAmount ? parseFloat(data.emiAmount) : undefined,
    moratoriumPeriod: data.moratoriumPeriod ? parseInt(data.moratoriumPeriod, 10) : undefined,
    emisPaid: data.emisPaid ? parseInt(data.emisPaid, 10) : undefined,
    disbursements: disbursements.length > 0 ? disbursements : undefined,
    rateChanges: rateChanges.length > 0 ? rateChanges : undefined,
    transactions: transactions.length > 0 ? transactions : undefined,
  }
}


export async function calculateOutstandingBalanceAction(
  prevState: any,
  formData: FormData,
) {
    if (!formData.has('loanType')) {
        return { type: 'initial' };
    }

    const data = createObjectFromFormData(formData);
    
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
