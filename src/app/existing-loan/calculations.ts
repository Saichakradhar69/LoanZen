
// src/app/existing-loan/calculations.ts

export type AmortizationData = {
  month: number;
  paymentDate: string;
  beginningBalance: number;
  payment: number;
  principal: number;
  interest: number;
  endingBalance: number;
};

export type CalculationResult = {
  emi: number;
  totalInterest: number;
  totalRepayment: number;
  schedule: AmortizationData[];
};

/**
 * Calculates EMI and amortization schedule for a flat-rate loan.
 * @param principal - The original loan amount.
 * @param annualRate - The annual interest rate in percent (e.g., 10 for 10%).
 * @param tenureYears - The loan term in years.
 * @returns An object with EMI, total interest, and the amortization schedule.
 */
export function calculateFlatRate(principal: number, annualRate: number, tenureYears: number): CalculationResult {
  const totalMonths = tenureYears * 12;
  const totalInterest = principal * (annualRate / 100) * tenureYears;
  const totalRepayment = principal + totalInterest;
  const emi = totalRepayment / totalMonths;

  const monthlyInterest = totalInterest / totalMonths;
  const monthlyPrincipal = emi - monthlyInterest;

  const schedule: AmortizationData[] = [];
  let beginningBalance = principal;
  let paymentDate = new Date();

  for (let i = 1; i <= totalMonths; i++) {
    paymentDate.setMonth(paymentDate.getMonth() + 1);
    const endingBalance = beginningBalance - monthlyPrincipal;
    
    schedule.push({
      month: i,
      paymentDate: paymentDate.toISOString().split('T')[0],
      beginningBalance: parseFloat(beginningBalance.toFixed(2)),
      payment: parseFloat(emi.toFixed(2)),
      principal: parseFloat(monthlyPrincipal.toFixed(2)),
      interest: parseFloat(monthlyInterest.toFixed(2)),
      endingBalance: parseFloat(Math.max(0, endingBalance).toFixed(2)),
    });
    
    beginningBalance = endingBalance;
  }

  return {
    emi: parseFloat(emi.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    totalRepayment: parseFloat(totalRepayment.toFixed(2)),
    schedule,
  };
}

/**
 * Calculates EMI and amortization schedule for a reducing balance loan.
 * @param principal - The original loan amount.
 * @param annualRate - The annual interest rate in percent (e.g., 7.5 for 7.5%).
 * @param tenureYears - The loan term in years.
 * @returns An object with EMI, total interest, and the amortization schedule.
 */
export function calculateReducingBalance(principal: number, annualRate: number, tenureYears: number): CalculationResult {
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = tenureYears * 12;

  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  const totalRepayment = emi * totalMonths;
  const totalInterest = totalRepayment - principal;
  
  const schedule: AmortizationData[] = [];
  let beginningBalance = principal;
  let paymentDate = new Date();

  for (let i = 1; i <= totalMonths; i++) {
    paymentDate.setMonth(paymentDate.getMonth() + 1);
    const interest = beginningBalance * monthlyRate;
    const principalPaid = emi - interest;
    const endingBalance = beginningBalance - principalPaid;

    schedule.push({
      month: i,
      paymentDate: paymentDate.toISOString().split('T')[0],
      beginningBalance: parseFloat(beginningBalance.toFixed(2)),
      payment: parseFloat(emi.toFixed(2)),
      principal: parseFloat(principalPaid.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      endingBalance: parseFloat(Math.max(0, endingBalance).toFixed(2)),
    });

    beginningBalance = endingBalance;
  }

  return {
    emi: parseFloat(emi.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    totalRepayment: parseFloat(totalRepayment.toFixed(2)),
    schedule,
  };
}
