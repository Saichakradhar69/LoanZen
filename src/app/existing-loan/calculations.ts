// src/app/existing-loan/calculations.ts

import type { ExistingLoanFormData } from './form';
import type { CalculationResult } from './actions';
import { calculateStandardLoan } from './loan-calculations/standard-loan';
import { calculateEducationLoan } from './loan-calculations/education-loan';
import { calculateCreditLine } from './loan-calculations/credit-line';
import { calculateCustomLoan } from './loan-calculations/custom-loan';


export function performExistingLoanCalculations(data: ExistingLoanFormData): CalculationResult {
    
    switch (data.loanType) {
        case 'personal':
        case 'car':
        case 'home':
            return calculateStandardLoan(data);
        case 'education':
            return calculateEducationLoan(data);
        case 'credit-line':
            return calculateCreditLine(data);
        case 'custom':
            return calculateCustomLoan(data);
        default:
             throw new Error(`Unsupported loan type: ${data.loanType}`);
    }
}
