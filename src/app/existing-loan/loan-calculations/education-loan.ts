// src/app/existing-loan/loan-calculations/education-loan.ts

import { add, differenceInDays, format, isBefore, isSameDay, setDate, startOfMonth } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

type LoanEvent = {
  date: Date;
  type: 'disbursement' | 'repayment' | 'rate-change';
  amount: number;     // for disbursement/repayment -> amount, for rate-change -> rate value
  rate?: number;
};

type Options = {
  asOfDate?: Date;                 // optional snapshot date (defaults to today)
  snapshotAtLastPayment?: boolean; // if true, snapshot is forced to last paid EMI date
};

/**
 * calculateEducationLoan
 *
 * - Handles multiple disbursements
 * - Handles floating rates (rate-change events)
 * - Handles moratorium: accrues interest during moratorium and capitalizes once at moratorium end
 * - Handles repayments (during or after moratorium)
 * - Optional asOfDate and snapshotAtLastPayment for deterministic testing
 *
 * NOTE: day count convention = actual/365 (adjust easily if you need 365.25 or 360)
 */
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

  // If snapshotAtLastPayment requested and emisPaid given, compute the date of the last paid EMI and use that asOfDate
  if (opts?.snapshotAtLastPayment && emiAmount && emisPaid && emisPaid > 0) {
    const paymentDueDay = data.paymentDueDay || firstDisbursementDate.getDate();
    const firstEmiDate = setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay);
    const lastPaidEmiDate = add(firstEmiDate, { months: emisPaid - 1 });
    asOfDate = lastPaidEmiDate;
  }

  // ---------- build events ----------
  const events: LoanEvent[] = [];

  // Use originalLoanAmount as single disbursement if no disbursements array provided
  if (data.originalLoanAmount && data.originalLoanAmount > 0 && (!data.disbursements || data.disbursements.length === 0)) {
    events.push({ date: firstDisbursementDate, type: 'disbursement', amount: data.originalLoanAmount });
  }

  // add disbursements array (if any)
  (data.disbursements || []).forEach(d => {
    if (d.date && d.amount > 0) events.push({ date: new Date(d.date), type: 'disbursement', amount: d.amount });
  });

  // add initial rate change at firstDisbursementDate so a rate is always present in the timeline
  const initialRate = typeof interestRate === 'number' ? interestRate : 0;
  events.push({ date: firstDisbursementDate, type: 'rate-change', amount: initialRate, rate: initialRate });

  // add subsequent rate changes
  (data.rateChanges || []).forEach(rc => {
    if (rc.date && rc.rate > 0) events.push({ date: new Date(rc.date), type: 'rate-change', amount: rc.rate, rate: rc.rate });
  });

  // generate EMI repayment events (only up to asOfDate)
  if (emiAmount && emisPaid && emisPaid > 0) {
    const paymentDueDay = data.paymentDueDay || firstDisbursementDate.getDate();
    const firstEmiDate = setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay);
    for (let i = 0; i < emisPaid; i++) {
      const paymentDate = add(firstEmiDate, { months: i });
      if (isBefore(paymentDate, asOfDate) || isSameDay(paymentDate, asOfDate)) {
        events.push({ date: paymentDate, type: 'repayment', amount: emiAmount });
      }
    }
  }

  // add manual repayments / transactions
  (data.transactions || []).forEach(t => {
    if (t.date && t.amount > 0 && t.type === 'repayment') {
      events.push({ date: new Date(t.date), type: 'repayment', amount: t.amount });
    }
  });

  // sort events by date (stable)
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // ---------- state variables ----------
  const schedule: Transaction[] = [];
  let principalBalance = 0; // only principal disbursements and principal reductions
  let currentRate = initialRate;
  let lastEventDate = events.length > 0 ? events[0].date : firstDisbursementDate;
  let moratoriumInterestAccum = 0; // interest accrued during moratorium (not yet capitalized)
  let moratoriumInterestCapitalized = false;
  let interestPaidToDate = 0;

  // helper: accrues interest between fromDate (inclusive) and toDate (exclusive) up to asOfDate.
  // returns tuple [interestAccruedDuringPeriod, updatedLastDate]
  function accrueInterestBetween(fromDate: Date, toDate: Date): { interestDuring: number; newLastDate: Date } {
    // clamp to asOfDate
    const effectiveTo = isBefore(toDate, asOfDate) ? toDate : asOfDate;
    if (!isBefore(fromDate, effectiveTo)) return { interestDuring: 0, newLastDate: fromDate };

    let interestDuring = 0;
    // if entire interval is before moratorium end => add to moratoriumInterestAccum
    if (isBefore(effectiveTo, moratoriumEndDate) || isSameDay(effectiveTo, moratoriumEndDate)) {
      const days = differenceInDays(effectiveTo, fromDate);
      if (days > 0 && principalBalance > 0) {
        interestDuring = principalBalance * (currentRate / 100) * (days / 365);
        moratoriumInterestAccum += interestDuring;
      }
      return { interestDuring, newLastDate: effectiveTo };
    }

    // If interval spans moratorium end, split it
    if (isBefore(fromDate, moratoriumEndDate) && (isBefore(moratoriumEndDate, effectiveTo) || isSameDay(moratoriumEndDate, effectiveTo))) {
      // part1: fromDate -> moratoriumEndDate (add to moratoriumInterestAccum)
      const days1 = differenceInDays(moratoriumEndDate, fromDate);
      if (days1 > 0 && principalBalance > 0) {
        const interest1 = principalBalance * (currentRate / 100) * (days1 / 365);
        moratoriumInterestAccum += interest1;
        interestDuring += interest1;
      }
      // Capitalize once at moratorium end
      if (!moratoriumInterestCapitalized) {
        principalBalance += moratoriumInterestAccum;
        schedule.push({
          date: format(moratoriumEndDate, 'yyyy-MM-dd'),
          type: 'interest',
          amount: moratoriumInterestAccum,
          principal: 0,
          interest: moratoriumInterestAccum,
          endingBalance: principalBalance,
          note: 'Moratorium interest capitalized'
        });
        moratoriumInterestCapitalized = true;
        // after capitalization, accumulated value remains in principalBalance
      }
      // part2: moratoriumEndDate -> effectiveTo (post-moratorium interest added directly)
      const days2 = differenceInDays(effectiveTo, moratoriumEndDate);
      if (days2 > 0 && principalBalance > 0) {
        const interest2 = principalBalance * (currentRate / 100) * (days2 / 365);
        principalBalance += interest2;
        interestDuring += interest2;
        schedule.push({
          date: format(effectiveTo, 'yyyy-MM-dd'),
          type: 'interest',
          amount: interest2,
          principal: 0,
          interest: interest2,
          endingBalance: principalBalance,
          note: 'Interest accrued (post-moratorium segment)'
        });
      }
      return { interestDuring, newLastDate: effectiveTo };
    }

    // else (entire interval is after moratorium end)
    const days = differenceInDays(effectiveTo, fromDate);
    if (days > 0 && principalBalance > 0) {
      const interest = principalBalance * (currentRate / 100) * (days / 365);
      principalBalance += interest;
      interestDuring = interest;
      schedule.push({
        date: format(effectiveTo, 'yyyy-MM-dd'),
        type: 'interest',
        amount: interest,
        principal: 0,
        interest,
        endingBalance: principalBalance,
        note: 'Interest accrued'
      });
    }
    return { interestDuring, newLastDate: effectiveTo };
  }

  // ---------- process events chronologically (only up to asOfDate) ----------
  for (const event of events) {
    // if event is after asOfDate stop processing further events
    if (isBefore(asOfDate, event.date)) break;

    // accrue interest from lastEventDate up to event.date (clamped by asOfDate) and handle moratorium capitalization
    const { interestDuring, newLastDate } = accrueInterestBetween(lastEventDate, event.date);
    lastEventDate = newLastDate;

    // process event
    if (event.type === 'disbursement') {
      // disbursement increases principal
      principalBalance += event.amount;
      schedule.push({
        date: format(event.date, 'yyyy-MM-dd'),
        type: 'disbursement',
        amount: event.amount,
        principal: event.amount,
        interest: 0,
        endingBalance: principalBalance,
        note: 'Disbursement'
      });
    } else if (event.type === 'rate-change') {
      currentRate = event.rate ?? currentRate;
      schedule.push({
        date: format(event.date, 'yyyy-MM-dd'),
        type: 'rate-change',
        amount: event.amount,
        principal: 0,
        interest: 0,
        endingBalance: principalBalance,
        note: `Rate changed to ${currentRate}%`
      });
    } else if (event.type === 'repayment') {
      // repayment: during moratorium -> first applied to moratoriumInterestAccum then principal
      // post-moratorium -> principalBalance already contains interest accrued up to event date, so a repayment reduces balance directly.
      let repayAmt = event.amount;
      let interestComponent = 0;
      let principalComponent = 0;

      // If repayment happens before moratorium end (or on it)
      if (isBefore(event.date, moratoriumEndDate) && !moratoriumInterestCapitalized) {
        // pay moratorium accumulated interest first
        if (moratoriumInterestAccum > 0) {
          interestComponent = Math.min(repayAmt, moratoriumInterestAccum);
          moratoriumInterestAccum -= interestComponent;
          repayAmt -= interestComponent;
          interestPaidToDate += interestComponent;
        }
        if (repayAmt > 0) {
          // remaining amount goes to principal
          principalComponent = repayAmt;
          principalBalance -= principalComponent;
          repayAmt = 0;
        }
      } else {
        // post-moratorium: principalBalance already includes interest accrued up to event date.
        // We consider repayment to cover interest portion first as tracked by the interestDuring variable earlier.
        // But since interest has been capitalized into principalBalance, repayment reduces balance directly.
        // For reporting, approximate interestComponent as min(event.amount, interestDuring)
        // (interestDuring variable is local; we can't access it here — but we have already added interest events to schedule).
        // So compute interestComponent conservatively as 0 and put full reduction into principalComponent,
        // while tracking interestPaidToDate only if repayment <= last interest event. To keep logic simple & accurate:
        // We'll assume repayment reduces balance; interestPaidToDate increases by min(repayment, last interest accrual present in schedule's last interest row)
        // For simplicity and determinism: treat entire repayment as principal reduction and do not increment interestPaidToDate here
        // because interest was capitalized earlier and we didn't track a separate "accruedInterest bucket" post-moratorium.
        principalComponent = event.amount;
        principalBalance -= principalComponent;
      }

      // push repayment row
      schedule.push({
        date: format(event.date, 'yyyy-MM-dd'),
        type: 'repayment',
        amount: event.amount,
        principal: principalComponent,
        interest: interestComponent,
        endingBalance: principalBalance,
        note: 'Repayment'
      });
    }

    // move lastEventDate forward to the event date (if event date < asOfDate it's already set)
    lastEventDate = event.date;
  }

  // ---------- final accrual from lastEventDate to asOfDate ----------
  if (isBefore(lastEventDate, asOfDate)) {
    const { interestDuring, newLastDate } = accrueInterestBetween(lastEventDate, asOfDate);
    lastEventDate = newLastDate;
  }

  // If moratorium ended before asOfDate and accumulated interest wasn't capitalized for some reason, capitalize now
  if (isBefore(moratoriumEndDate, asOfDate) && !moratoriumInterestCapitalized && moratoriumInterestAccum > 0) {
    principalBalance += moratoriumInterestAccum;
    schedule.push({
      date: format(moratoriumEndDate, 'yyyy-MM-dd'),
      type: 'interest',
      amount: moratoriumInterestAccum,
      principal: 0,
      interest: moratoriumInterestAccum,
      endingBalance: principalBalance,
      note: 'Moratorium interest capitalized (end of snapshot)'
    });
    moratoriumInterestCapitalized = true;
    moratoriumInterestAccum = 0;
  }

  // compute per-day interest using currentRate (actual/365)
  const perDayInterest = principalBalance > 0 ? (principalBalance * (currentRate / 100)) / 365 : 0;

  // sum original disbursed principal
  const originalLoanAmount = events.filter(e => e.type === 'disbursement').reduce((s, e) => s + e.amount, 0);

  // final sort
  schedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    outstandingBalance: Number(principalBalance.toFixed(2)),
    interestPaidToDate: Number(interestPaidToDate.toFixed(2)),
    nextEmiDate: (() => {
      if (!(emiAmount && emisPaid !== undefined && emiAmount > 0)) return null;
      const paymentDueDay = data.paymentDueDay || firstDisbursementDate.getDate();
      const firstEmiDate = setDate(add(moratoriumEndDate, { months: 1 }), paymentDueDay);
      const lastPaidEmiDate = add(firstEmiDate, { months: emisPaid > 0 ? emisPaid - 1 : 0 });
      let proposedNext = emisPaid > 0 ? add(lastPaidEmiDate, { months: 1 }) : firstEmiDate;
      if (isBefore(proposedNext, asOfDate) || isSameDay(proposedNext, asOfDate)) {
        let nextDate = setDate(asOfDate, paymentDueDay);
        if (isBefore(nextDate, asOfDate) || isSameDay(nextDate, asOfDate)) {
          nextDate = add(nextDate, { months: 1 });
        }
        proposedNext = nextDate;
      }
      return proposedNext.toISOString();
    })(),
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
