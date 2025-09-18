// src/app/existing-loan/loan-calculations/education-loan.ts
import { add, differenceInDays, format, isBefore, isAfter, setDate, isSameDay } from 'date-fns';
import type { ExistingLoanFormData } from '../form';
import type { CalculationResult, Transaction } from '../actions';

interface LoanEvent {
  date: Date;
  type: 'disbursement' | 'repayment' | 'rate-change' | 'interest';
  amount: number;
  rate?: number;
  note?: string;
}

interface DailyBalance {
  date: Date;
  balance: number;
  rate: number;
  interestAccrued: number;
}

export function calculateEducationLoan(
  data: ExistingLoanFormData,
  asOfDate: Date = new Date()
): CalculationResult {
  // Validate input
  if (!data.disbursementDate) {
    throw new Error('Disbursement date is required');
  }

  const firstDisbursementDate = new Date(data.disbursementDate);
  const moratoriumEndDate = add(firstDisbursementDate, { months: data.moratoriumPeriod || 0 });
  const paymentDueDay = data.paymentDueDay || firstDisbursementDate.getDate();

  // Build and sort events
  const events = buildLoanEvents(data, firstDisbursementDate, moratoriumEndDate, paymentDueDay, asOfDate);
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate daily balances
  const dailyBalances = calculateDailyBalances(events, firstDisbursementDate, asOfDate, moratoriumEndDate);
  
  // Calculate results
  const finalBalance = dailyBalances.length > 0 ? dailyBalances[dailyBalances.length - 1].balance : 0;
  
  const totalPrincipal = events
    .filter(e => e.type === 'disbursement')
    .reduce((sum, e) => sum + e.amount, 0);

  // Generate schedule
  const schedule = generateSchedule(events, dailyBalances);
  
  const interestPaidToDate = calculateInterestPaid(events, dailyBalances);

  return {
    outstandingBalance: Number(finalBalance.toFixed(2)),
    interestPaidToDate: Number(interestPaidToDate.toFixed(2)),
    nextEmiDate: calculateNextEmiDate(data, moratoriumEndDate, paymentDueDay, asOfDate, finalBalance),
    originalLoanAmount: totalPrincipal,
    loanName: data.loanName || 'Education Loan',
    loanType: data.loanType || 'education',
    interestType: data.interestType || 'reducing',
    interestRate: getCurrentRate(events, asOfDate),
    perDayInterest: calculatePerDayInterest(finalBalance, getCurrentRate(events, asOfDate)),
    schedule,
    emiAmount: data.emiAmount || 0
  };
}

// Helper functions
function buildLoanEvents(
  data: ExistingLoanFormData,
  firstDisbursementDate: Date,
  moratoriumEndDate: Date,
  paymentDueDay: number,
  asOfDate: Date
): LoanEvent[] {
  const events: LoanEvent[] = [];

  // Add disbursements
  if (data.originalLoanAmount && data.originalLoanAmount > 0 && (!data.disbursements || data.disbursements.length === 0)) {
    events.push({
      date: firstDisbursementDate,
      type: 'disbursement',
      amount: data.originalLoanAmount,
      note: 'Initial disbursement'
    });
  }

  data.disbursements?.forEach(d => {
    if (d.date && d.amount > 0) {
      events.push({
        date: new Date(d.date),
        type: 'disbursement',
        amount: d.amount,
        note: 'Additional disbursement'
      });
    }
  });

  // Add rate changes
  const initialRate = typeof data.interestRate === 'number' ? data.interestRate : 0;
  events.push({
    date: firstDisbursementDate,
    type: 'rate-change',
    amount: initialRate,
    rate: initialRate,
    note: 'Initial rate'
  });

  data.rateChanges?.forEach(rc => {
    if (rc.date && rc.rate > 0) {
      events.push({
        date: new Date(rc.date),
        type: 'rate-change',
        amount: rc.rate,
        rate: rc.rate,
        note: 'Rate change'
      });
    }
  });

  // Add fixed EMI payments
    if (data.emiAmount && data.emisPaid && data.emisPaid > 0) {
        let firstEmiDate = add(moratoriumEndDate, { months: 1 });
        firstEmiDate = setDate(firstEmiDate, paymentDueDay);
        
        const actualEmisPaid = (data.emisPaid || 0) - (data.missedEmis || 0);

        for (let i = 0; i < actualEmisPaid; i++) {
            const paymentDate = add(firstEmiDate, { months: i });
             if (isBefore(paymentDate, asOfDate) || isSameDay(paymentDate, asOfDate)) {
                 events.push({ date: paymentDate, type: 'repayment', amount: data.emiAmount, note: `EMI #${i+1}` });
             }
        }
    }


  // Add manual transaction payments
  data.transactions?.forEach(t => {
    if (t.date && t.amount > 0 && t.type === 'repayment') {
      events.push({
        date: new Date(t.date),
        type: 'repayment',
        amount: t.amount,
        note: 'Ad-hoc Repayment'
      });
    }
  });

  return events;
}

function calculateDailyBalances(
  events: LoanEvent[],
  startDate: Date,
  endDate: Date,
  moratoriumEndDate: Date
): DailyBalance[] {
  if (events.length === 0) return [];
  
  const dailyBalances: DailyBalance[] = [];
  let currentBalance = 0;
  let currentRate = 0;
  let loopStartDate = events[0].date;

  // Initialize with first rate if available
  const initialRateEvent = events.find(e => e.type === 'rate-change');
  if (initialRateEvent) {
    currentRate = initialRateEvent.rate || 0;
  }

  for (let currentDate = new Date(loopStartDate); currentDate <= endDate; currentDate = add(currentDate, { days: 1 })) {
    let todaysInterest = 0;
    
    // Calculate interest for the previous day's balance
    if (currentBalance > 0) {
        const dailyRate = currentRate / 100 / 365.25;
        todaysInterest = currentBalance * dailyRate;
    }

    // Process events for this day
    const todaysEvents = events.filter(e => 
      isSameDay(e.date, currentDate)
    );

    todaysEvents.forEach(event => {
      switch (event.type) {
        case 'disbursement':
          currentBalance += event.amount;
          break;
        case 'repayment':
          // Repayment is applied after interest for the day is calculated
          currentBalance -= event.amount;
          break;
        case 'rate-change':
          currentRate = event.rate || currentRate;
          break;
      }
    });

    // Capitalize interest if within or at the end of moratorium
    if (isBefore(currentDate, moratoriumEndDate) || isSameDay(currentDate, moratoriumEndDate)) {
      currentBalance += todaysInterest;
      todaysInterest = 0; // Interest is capitalized, not just accrued
    }

    dailyBalances.push({
      date: new Date(currentDate),
      balance: currentBalance,
      rate: currentRate,
      interestAccrued: todaysInterest
    });
  }

  return dailyBalances;
}


function generateSchedule(events: LoanEvent[], dailyBalances: DailyBalance[]): Transaction[] {
  const schedule: Transaction[] = [];

  events.forEach(event => {
    const dailyBalanceOnEventDay = dailyBalances.find(d => isSameDay(d.date, event.date));
    
    let principal = 0;
    let interest = 0;
    
    if (event.type === 'disbursement') {
        principal = event.amount;
    } else if (event.type === 'repayment') {
        // Find interest accrued since last payment to split principal/interest
        const lastPaymentIndex = schedule.slice().reverse().findIndex(s => s.type === 'repayment' || s.type === 'disbursement' || s.type === 'interest');
        const lastPaymentDate = lastPaymentIndex !== -1 ? new Date(schedule.slice().reverse()[lastPaymentIndex].date) : events[0].date;
        
        const interestSinceLastEvent = dailyBalances
            .filter(d => isAfter(d.date, lastPaymentDate) && (isBefore(d.date, event.date) || isSameDay(d.date, event.date)))
            .reduce((sum, day) => sum + day.interestAccrued, 0);

        interest = Math.min(event.amount, interestSinceLastEvent);
        principal = event.amount - interest;
    }

    schedule.push({
      date: format(event.date, 'yyyy-MM-dd'),
      type: event.type,
      amount: event.amount,
      principal: principal,
      interest: interest,
      endingBalance: dailyBalanceOnEventDay?.balance || 0,
      note: event.note
    });
  });

  // Add final accrued interest if any
  const lastBalance = dailyBalances[dailyBalances.length - 1];
  if (lastBalance && lastBalance.interestAccrued > 0) {
      schedule.push({
           date: format(lastBalance.date, 'yyyy-MM-dd'),
            type: 'interest',
            amount: lastBalance.interestAccrued,
            principal: 0,
            interest: lastBalance.interestAccrued,
            endingBalance: lastBalance.balance + lastBalance.interestAccrued,
            note: "Interest Accrued Until Today"
      })
  }

  return schedule.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}


function calculateInterestPaid(events: LoanEvent[], dailyBalances: DailyBalance[]): number {
  return events
    .filter(e => e.type === 'repayment')
    .reduce((total, payment) => {
      const lastPaymentOrDisbursement = events
        .filter(e => e.date < payment.date && (e.type === 'repayment' || e.type === 'disbursement'))
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

      const periodStartDate = lastPaymentOrDisbursement ? lastPaymentOrDisbursement.date : events[0].date;

      const interestForPeriod = dailyBalances
        .filter(d => d.date > periodStartDate && d.date <= payment.date)
        .reduce((sum, day) => sum + day.interestAccrued, 0);
      
      return total + Math.min(payment.amount, interestForPeriod);
    }, 0);
}

function calculateNextEmiDate(
  data: ExistingLoanFormData,
  moratoriumEndDate: Date,
  paymentDueDay: number,
  asOfDate: Date,
  currentBalance: number
): string | null {
  if (currentBalance <= 0 || !data.emiAmount || !data.emisPaid) return null;

    const firstEmiDate = add(moratoriumEndDate, { months: 1 });
    const firstEmiDateWithDay = setDate(firstEmiDate, paymentDueDay);
    
    let proposedNextDate = add(firstEmiDateWithDay, { months: data.emisPaid });

    if (isBefore(proposedNextDate, asOfDate) || isSameDay(proposedNextDate, asOfDate)) {
        let nextDate = setDate(asOfDate, paymentDueDay);
        if (isBefore(nextDate, asOfDate) || isSameDay(nextDate, asOfDate)) {
            nextDate = add(nextDate, { months: 1 });
        }
        proposedNextDate = nextDate;
    }

  return proposedNextDate.toISOString();
}


function getCurrentRate(events: LoanEvent[], asOfDate: Date): number {
  const rateEvents = events
    .filter(e => e.type === 'rate-change' && (isBefore(e.date, asOfDate) || isSameDay(e.date, asOfDate)) )
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return rateEvents[0]?.rate || 0;
}

function calculatePerDayInterest(balance: number, rate: number): number {
  if (balance <= 0) return 0;
  return balance * (rate / 100) / 365.25;
}
