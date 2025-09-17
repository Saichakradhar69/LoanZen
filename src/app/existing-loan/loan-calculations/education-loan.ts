// src/app/existing-loan/loan-calculations/education-loan.ts

import { add, differenceInDays, format, isBefore, isSameDay, setDate, startOfMonth } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

type LoanEvent = {
  date: Date;
  type: 'disbursement' | 'repayment' | 'rate-change';
  amount: number;     // for disbursement/repayment -> amount, for rate-change -> rate value
  rate?: number;
  note?: string;
};

type Options = {
  asOfDate?: Date;                 // optional snapshot date (defaults to today)
};

export function calculateEducationLoan(
  data: ExistingLoanFormData,
  opts?: Options
): CalculationResult {
  const {
    disbursementDate,
    interestRate,
    moratoriumPeriod = 0,
    loanName,
    loanType,
    interestType,
    emiAmount,
    emisPaid,
  } = data;

  if (!disbursementDate) throw new Error('Disbursement date is required.');

  // ---------- prepare dates and options ----------
  const firstDisbursementDate = new Date(disbursementDate);
  const moratoriumEndDate = add(firstDisbursementDate, { months: moratoriumPeriod });
  let asOfDate = opts?.asOfDate ? new Date(opts.asOfDate) : new Date();
  const paymentDueDay = data.paymentDueDay || firstDisbursementDate.getDate();

  // ---------- build events ----------
  const events: LoanEvent[] = [];

  if (data.originalLoanAmount && data.originalLoanAmount > 0 && (!data.disbursements || data.disbursements.length === 0)) {
    events.push({ date: firstDisbursementDate, type: 'disbursement', amount: data.originalLoanAmount });
  }

  (data.disbursements || []).forEach(d => {
    if (d.date && d.amount > 0) events.push({ date: new Date(d.date), type: 'disbursement', amount: d.amount });
  });

  const initialRate = typeof interestRate === 'number' ? interestRate : 0;
  events.push({ date: firstDisbursementDate, type: 'rate-change', amount: initialRate, rate: initialRate });

  (data.rateChanges || []).forEach(rc => {
    if (rc.date && rc.rate > 0) events.push({ date: new Date(rc.date), type: 'rate-change', amount: rc.rate, rate: rc.rate });
  });

  if (emiAmount && emisPaid && emisPaid > 0) {
    const firstEmiDate = setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay);
    for (let i = 0; i < emisPaid; i++) {
      const paymentDate = add(firstEmiDate, { months: i });
      if (isBefore(paymentDate, asOfDate) || isSameDay(paymentDate, asOfDate)) {
        events.push({ date: paymentDate, type: 'repayment', amount: emiAmount, note: `EMI #${i + 1}` });
      }
    }
  }

  (data.transactions || []).forEach(t => {
    if (t.date && t.amount > 0 && t.type === 'repayment') {
      events.push({ date: new Date(t.date), type: 'repayment', amount: t.amount });
    }
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // ---------- state variables ----------
  const schedule: Transaction[] = [];
  let balance = 0;
  let currentRate = initialRate;
  let lastEventDate = events.length > 0 ? events[0].date : firstDisbursementDate;
  let accumulatedInterestDuringMoratorium = 0;
  let interestPaidToDate = 0;
  let lastPaymentDateForAccrual = firstDisbursementDate;

  for (const event of events) {
    if (isBefore(asOfDate, event.date)) continue;

    const daysSinceLastEvent = differenceInDays(event.date, lastEventDate);
    const isDuringMoratorium = isBefore(event.date, moratoriumEndDate);

    if (daysSinceLastEvent > 0 && balance > 0) {
        if(isDuringMoratorium) {
            const interest = balance * (currentRate / 100 / 365.25) * daysSinceLastEvent;
            accumulatedInterestDuringMoratorium += interest;
        }
    }

    lastEventDate = event.date;

    switch (event.type) {
      case 'disbursement':
        balance += event.amount;
        schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'disbursement', amount: event.amount, principal: event.amount, interest: 0, endingBalance: balance, note: 'Disbursement' });
        lastPaymentDateForAccrual = event.date;
        break;
      
      case 'rate-change':
        currentRate = event.rate ?? currentRate;
        schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'rate-change', amount: event.amount, principal: 0, interest: 0, endingBalance: balance, note: `Rate changed to ${currentRate}%` });
        break;

      case 'repayment':
        if(isDuringMoratorium) {
            const interestPaid = Math.min(event.amount, accumulatedInterestDuringMoratorium);
            const principalPaid = event.amount - interestPaid;
            accumulatedInterestDuringMoratorium -= interestPaid;
            balance -= principalPaid;
            interestPaidToDate += interestPaid;
            schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'repayment', amount: event.amount, principal: principalPaid, interest: interestPaid, endingBalance: balance, note: event.note || 'Repayment (Moratorium)'});

        } else {
             // After moratorium, use standard monthly amortization for EMIs
             const monthlyInterestRate = currentRate / 100 / 12;
             const interestForPeriod = balance * monthlyInterestRate;
             const principalComponent = event.amount - interestForPeriod;
             
             balance -= principalComponent;
             interestPaidToDate += interestForPeriod;

             schedule.push({ date: format(event.date, 'yyyy-MM-dd'), type: 'repayment', amount: event.amount, principal: principalComponent, interest: interestForPeriod, endingBalance: balance, note: event.note || 'Repayment'});
        }
        lastPaymentDateForAccrual = event.date;
        break;
    }
  }

  if (accumulatedInterestDuringMoratorium > 0 && isBefore(moratoriumEndDate, asOfDate)) {
      balance += accumulatedInterestDuringMoratorium;
      schedule.push({ date: format(moratoriumEndDate, 'yyyy-MM-dd'), type: 'interest', amount: accumulatedInterestDuringMoratorium, principal: 0, interest: accumulatedInterestDuringMoratorium, endingBalance: balance, note: 'Interest Capitalized' });
  }
  
  const daysSinceLastEvent = differenceInDays(asOfDate, lastPaymentDateForAccrual);
  if (daysSinceLastEvent > 0 && balance > 0) {
      const finalInterest = balance * (currentRate / 100 / 365.25) * daysSinceLastEvent;
      balance += finalInterest;
      schedule.push({ date: format(asOfDate, 'yyyy-MM-dd'), type: 'interest', amount: finalInterest, principal: 0, interest: finalInterest, endingBalance: balance, note: 'Interest Accrued' });
  }

  const perDayInterest = balance > 0 ? (balance * (currentRate / 100)) / 365 : 0;
  const originalLoanAmount = events.filter(e => e.type === 'disbursement').reduce((s, e) => s + e.amount, 0);
  schedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let nextEmiDate: Date | null = null;
  if (balance > 0 && emiAmount && emisPaid !== undefined) {
      const firstEmiDate = setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay);
      const lastPaidEmiDate = add(firstEmiDate, { months: emisPaid > 0 ? emisPaid - 1 : -1 });
      let proposedNextDate = add(lastPaidEmiDate, { months: 1 });

      if (isBefore(proposedNextDate, asOfDate) && !isSameDay(proposedNextDate, asOfDate)) {
           let nextDate = setDate(asOfDate, paymentDueDay);
           if(isBefore(nextDate, asOfDate) || isSameDay(nextDate, asOfDate)) {
              nextDate = add(nextDate, {months: 1});
           }
           proposedNextDate = nextDate;
      }
      nextEmiDate = proposedNextDate;
  }

  return {
    outstandingBalance: Number(balance.toFixed(2)),
    interestPaidToDate: Number(interestPaidToDate.toFixed(2)),
    nextEmiDate: nextEmiDate ? nextEmiDate.toISOString() : null,
    originalLoanAmount,
    loanName,
    loanType,
    interestType,
    interestRate: currentRate,
    perDayInterest,
    schedule,
    emiAmount
  };
}
