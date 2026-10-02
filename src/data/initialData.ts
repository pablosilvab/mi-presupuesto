import { AppState, CreditCardData } from '@/types/budget';

export function todayDateStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function emptyCreditCard(): CreditCardData {
  return {
    billedAmount: 0,
    creditUsed: 0,
    periodExpenses: 0,
    averageBilled: 0,
    statementClosingDay: 20,
    statementDueDay: 5,
    paymentDay: 3,
  };
}

export function createEmptyState(): AppState {
  return {
    onboardingCompleted: false,
    hasCreditCard: false,
    hasInvestments: false,
    currentCheckingBalance: 0,
    startDate: todayDateStr(),
    incomes: [],
    fixedExpenses: [],
    creditCard: emptyCreditCard(),
    installmentPurchases: [],
    investments: [],
    dollarRate: 950,
    customProjectionsNotes: {},
    creditCardEstimates: {},
  };
}
