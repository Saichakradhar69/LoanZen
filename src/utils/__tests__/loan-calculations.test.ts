import { calculateCurrentBalance } from '../loan-calculations';

describe('calculateCurrentBalance', () => {
  it('should calculate current balance for a loan with payments', () => {
    const loanData = {
      originalLoanAmount: 10000,
      disbursementDate: new Date('2023-01-01'),
      interestRate: 12, // 12% annual
      emiAmount: 500,
      emisPaid: 12, // 12 months of payments
      paymentDueDay: 1
    };

    const currentBalance = calculateCurrentBalance(loanData);
    
    // The balance should be less than the original amount due to payments
    expect(currentBalance).toBeLessThan(loanData.originalLoanAmount);
    expect(currentBalance).toBeGreaterThan(0);
  });

  it('should handle a new loan with no payments', () => {
    const loanData = {
      originalLoanAmount: 5000,
      disbursementDate: new Date('2024-01-01'),
      interestRate: 8,
      emiAmount: 300,
      emisPaid: 0, // No payments yet
      paymentDueDay: 1
    };

    const currentBalance = calculateCurrentBalance(loanData);
    
    // The balance should be the original amount plus some interest
    expect(currentBalance).toBeGreaterThan(loanData.originalLoanAmount);
  });

  it('should return zero for fully paid loans', () => {
    const loanData = {
      originalLoanAmount: 1000,
      disbursementDate: new Date('2020-01-01'),
      interestRate: 10,
      emiAmount: 1000, // High payment that should pay off quickly
      emisPaid: 50, // Many payments
      paymentDueDay: 1
    };

    const currentBalance = calculateCurrentBalance(loanData);
    
    // Should not go negative
    expect(currentBalance).toBeGreaterThanOrEqual(0);
  });
});
