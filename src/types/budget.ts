export interface IncomeItem {
  id: string;
  name: string;
  amount: number;
}

export interface FixedExpenseItem {
  id: string;
  name: string;
  amount: number;
  category?: string;
  paid?: boolean;
}

export interface CreditCardData {
  billedAmount: number;
  creditUsed: number;
  periodExpenses: number;
  averageBilled: number;
  statementClosingDay?: number;
  statementDueDay?: number;
  paymentDay?: number;
}

export interface InstallmentPurchase {
  id: string;
  description: string;
  totalInstallments: number;
  currentInstallment: number;
  installmentAmount: number;
  category?: string;
  includedInCurrentBilled: boolean;
}

export interface ActiveInstallmentDetail {
  id: string;
  description: string;
  currentNumber: number;
  totalNumber: number;
  amount: number;
  addsToExpense: boolean;
}

export type InvestmentKind = 'apv' | 'stocks' | 'other';

export interface Investment {
  id: string;
  kind: InvestmentKind;
  provider: string;
  name: string;
  invested: number;
  contributions: number;
  stateBenefit?: number;
  year?: number;
  monthlyDpp?: number;
  ticker?: string;
  investedUsd?: number;
  contributionsUsd?: number;
  contributionsClp?: number;
  annualRatePct?: number;
}

export interface ProjectionMonth {
  dateStr: string;
  startingBalance: number;
  incomes: number;
  fixedExpenses: number;
  creditCardExpense: number;
  creditCardBaseExpense: number;
  creditCardInstallments: number;
  activeInstallments: ActiveInstallmentDetail[];
  netFlow: number;
  endingBalance: number;
  isFirstMonth: boolean;
  hasCustomCreditCardEstimate?: boolean;
}

export interface AppState {
  currentCheckingBalance: number;
  startDate: string;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  creditCard: CreditCardData;
  installmentPurchases: InstallmentPurchase[];
  investments: Investment[];
  dollarRate: number;
  customProjectionsNotes?: Record<string, string>;
  creditCardEstimates?: Record<string, number>;
  onboardingCompleted: boolean;
  hasCreditCard: boolean;
  hasInvestments: boolean;
  monthUndo?: MonthAdvanceSnapshot;
}

export interface MonthAdvanceSnapshot {
  startDate: string;
  currentCheckingBalance: number;
  billedAmount: number;
  installmentPurchases: InstallmentPurchase[];
}

export interface OnboardingInput {
  currentCheckingBalance: number;
  startDate: string;
  incomes: { name: string; amount: number }[];
  fixedExpenses: { name: string; amount: number }[];
  hasCreditCard: boolean;
  billedAmount: number;
  averageBilled: number;
  paymentDay: number;
}
