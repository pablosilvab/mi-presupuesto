import {
  AppState,
  ProjectionMonth,
  ActiveInstallmentDetail,
  InstallmentPurchase,
  Investment,
  InvestmentKind,
} from '@/types/budget';

export const INVESTMENT_KIND_LABEL: Record<InvestmentKind, string> = {
  apv: 'APV',
  stocks: 'Acciones',
  other: 'Otro',
};

export const PROVIDER_SUGGESTIONS = [
  'Fintual',
  'Mercado Pago',
  'Cuenta 2 AFP',
  'Racional',
  'SoyFocus',
  'Banco',
  'Interactive Brokers',
];

const SALARY_NAME_TOKEN = 'sueldo';

export function isSalaryIncomeName(name: string): boolean {
  return name.toLowerCase().includes(SALARY_NAME_TOKEN);
}

export function investmentTitle(inv: Investment): string {
  if (inv.kind === 'stocks') {
    const ticker = inv.ticker || inv.name;
    return ticker ? `${inv.provider} · ${ticker}` : `${inv.provider} · Acciones`;
  }
  if (inv.kind === 'apv') {
    const year = inv.year ? ` ${inv.year}` : '';
    const extra = inv.name && inv.name.toLowerCase() !== 'apv' ? ` · ${inv.name}` : '';
    return `${inv.provider} · APV${year}${extra}`;
  }
  return inv.name ? `${inv.provider} · ${inv.name}` : inv.provider;
}

export function investmentContributions(inv: Investment): number {
  if (inv.kind === 'stocks') return inv.contributionsClp || 0;
  return inv.contributions || 0;
}

export function investmentMarketValue(inv: Investment, dollarRate: number): number {
  if (inv.kind === 'stocks') return (inv.investedUsd || 0) * dollarRate;
  return inv.invested || 0;
}

export function investmentProfitClp(inv: Investment, dollarRate: number): number {
  return investmentMarketValue(inv, dollarRate) - investmentContributions(inv);
}

export function investmentProfitUsd(inv: Investment): number | null {
  if (inv.kind !== 'stocks') return null;
  return (inv.investedUsd || 0) - (inv.contributionsUsd || 0);
}

export function totalMonthlyDpp(investments: Investment[]): number {
  return investments
    .filter((inv) => inv.kind === 'apv')
    .reduce((sum, inv) => sum + (inv.monthlyDpp || 0), 0);
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDollarClp(rate: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}

export function parseCLPInput(raw: string | number): number {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatSignedCLP(amount: number): string {
  if (amount > 0) return `+${formatCLP(amount)}`;
  if (amount < 0) return `-${formatCLP(Math.abs(amount))}`;
  return formatCLP(0);
}

export function formatSignedUSD(amount: number): string {
  if (amount > 0) return `+${formatUSD(amount)}`;
  if (amount < 0) return `-${formatUSD(Math.abs(amount))}`;
  return formatUSD(0);
}

export function profitTone(amount: number): 'in' | 'out' | 'muted' {
  if (amount > 0) return 'in';
  if (amount < 0) return 'out';
  return 'muted';
}

function dateFromStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMonthTitle(dateStr: string): string {
  return capitalize(
    new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(dateFromStr(dateStr))
  );
}

export function formatMonthShort(dateStr: string): string {
  return capitalize(
    new Intl.DateTimeFormat('es-CL', { month: 'short', year: 'numeric' }).format(dateFromStr(dateStr))
  );
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function addMonths(dateStr: string, monthsToAdd: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1 + monthsToAdd, day);
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function calculateInstallmentsSummary(purchases: InstallmentPurchase[] = []) {
  let totalMonthlyActive = 0;
  let totalPendingDebt = 0;
  let totalPurchasesAmount = 0;

  for (const purchase of purchases) {
    totalPurchasesAmount += purchase.totalInstallments * purchase.installmentAmount;
    if (purchase.currentInstallment <= purchase.totalInstallments) {
      totalMonthlyActive += purchase.installmentAmount;
      const remainingAfterCurrent = Math.max(0, purchase.totalInstallments - purchase.currentInstallment);
      totalPendingDebt += remainingAfterCurrent * purchase.installmentAmount;
    }
  }

  return {
    totalMonthlyActive,
    totalPendingDebt,
    totalPurchasesAmount,
    count: purchases.length,
  };
}

export function calculateProjections(
  state: AppState,
  numMonths: number = 14,
  cardAverageOverride?: number,
  addInstallments: boolean = true
): ProjectionMonth[] {
  const totalIncomes = state.incomes.reduce((sum, item) => sum + item.amount, 0);
  const totalFixedExpenses = state.fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const currentBilled = state.creditCard.billedAmount;
  const averageBilled =
    cardAverageOverride !== undefined ? cardAverageOverride : state.creditCard.averageBilled;
  const purchases = state.installmentPurchases || [];

  const projections: ProjectionMonth[] = [];
  let currentBalance = state.currentCheckingBalance;

  for (let i = 0; i < numMonths; i++) {
    const dateStr = addMonths(state.startDate, i);
    const isFirstMonth = i === 0;
    const activeInstallments: ActiveInstallmentDetail[] = [];
    let monthlyInstallmentsTotal = 0;

    for (const purchase of purchases) {
      const installmentNum = purchase.currentInstallment + i;
      if (installmentNum <= purchase.totalInstallments && installmentNum >= 1) {
        const addsToExpense = !isFirstMonth || !purchase.includedInCurrentBilled;
        activeInstallments.push({
          id: purchase.id,
          description: purchase.description,
          currentNumber: installmentNum,
          totalNumber: purchase.totalInstallments,
          amount: purchase.installmentAmount,
          addsToExpense,
        });
        if (addsToExpense) {
          monthlyInstallmentsTotal += purchase.installmentAmount;
        }
      }
    }

    let cardExpense = 0;
    let baseExpense = 0;
    const customBase = state.creditCardEstimates?.[monthKey(dateStr)];
    const hasCustomCreditCardEstimate =
      Boolean(state.hasCreditCard) && !isFirstMonth && customBase !== undefined;

    if (!state.hasCreditCard) {
      baseExpense = 0;
      cardExpense = 0;
    } else if (isFirstMonth) {
      baseExpense = currentBilled;
      cardExpense = currentBilled;
    } else {
      baseExpense = hasCustomCreditCardEstimate ? customBase : averageBilled;
      cardExpense = addInstallments ? baseExpense + monthlyInstallmentsTotal : baseExpense;
    }

    const netFlow = totalIncomes - totalFixedExpenses - cardExpense;
    const startingBalance = currentBalance;
    const endingBalance = startingBalance + netFlow;

    projections.push({
      dateStr,
      startingBalance,
      incomes: totalIncomes,
      fixedExpenses: totalFixedExpenses,
      creditCardExpense: cardExpense,
      creditCardBaseExpense: baseExpense,
      creditCardInstallments: monthlyInstallmentsTotal,
      activeInstallments,
      netFlow,
      endingBalance,
      isFirstMonth,
      hasCustomCreditCardEstimate,
    });

    currentBalance = endingBalance;
  }

  return projections;
}

export function calculateInvestmentSummary(state: AppState) {
  const investments = state.investments || [];
  const totalContributions = investments.reduce((sum, inv) => sum + investmentContributions(inv), 0);
  const totalMarketValue = investments.reduce(
    (sum, inv) => sum + investmentMarketValue(inv, state.dollarRate),
    0
  );
  const totalProfit = totalMarketValue - totalContributions;
  const returnRatePct = totalContributions > 0 ? (totalProfit / totalContributions) * 100 : 0;
  const monthlyDpp = totalMonthlyDpp(investments);

  return {
    totalContributions,
    totalMarketValue,
    totalProfit,
    returnRatePct,
    monthlyDpp,
  };
}

export function calculateNetWorth(state: AppState) {
  const invSummary = calculateInvestmentSummary(state);
  const liquidCash = state.currentCheckingBalance;
  const totalAssets = liquidCash + invSummary.totalMarketValue;
  const creditCardDebt = state.hasCreditCard ? state.creditCard.billedAmount : 0;
  const netWorth = totalAssets - creditCardDebt;

  return {
    liquidCash,
    investments: invSummary.totalMarketValue,
    totalAssets,
    creditCardDebt,
    netWorth,
  };
}
