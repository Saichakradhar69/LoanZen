'use server';

import { getPrepaymentAdvice, PrepaymentAdvisorInput } from '@/ai/flows/prepayment-advisor';
import { z } from 'zod';

const PrepaymentAdvisorInputSchema = z.object({
  income: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive({ message: 'Monthly income must be a positive number.' })
  ),
  loans: z.array(
    z.object({
      loanName: z.string().min(1, { message: 'Loan name is required.' }),
      outstandingBalance: z.preprocess(
        (a) => parseFloat(z.string().parse(a)),
        z.number().positive({ message: 'Outstanding balance must be a positive number.' })
      ),
      interestRate: z.preprocess(
        (a) => parseFloat(z.string().parse(a)),
        z.number().min(0, { message: 'Interest rate cannot be negative.' }).max(100, {message: "Interest rate seems too high."})
      ),
      minimumPayment: z.preprocess(
        (a) => parseFloat(z.string().parse(a)),
        z.number().positive({ message: 'Minimum payment must be a positive number.' })
      ),
    })
  ).min(1, { message: "Please add at least one loan." }),
});

export async function getAdviceAction(
  prevState: any,
  formData: FormData,
) {
    const jsonLoans = formData.get('loans') as string;
    const loans = JSON.parse(jsonLoans);

    const data = {
        income: formData.get('income'),
        loans,
    }

    const validatedFields = PrepaymentAdvisorInputSchema.safeParse(data);
    
    if (!validatedFields.success) {
      return {
        type: 'error',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

  try {
    const result = await getPrepaymentAdvice(validatedFields.data as PrepaymentAdvisorInput);
    return { type: 'success', data: result };
  } catch (error) {
    console.error(error);
    return { type: 'error', errors: { _global: ['An unexpected error occurred. Please try again.'] } };
  }
}
