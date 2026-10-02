import { AppState, Investment, MonthAdvanceSnapshot } from '@/types/budget';
import { createEmptyState, emptyCreditCard } from '@/data/initialData';

export const STORAGE_KEY = 'mi-presupuesto-data-v1';

type LegacyApv = {
  id?: string;
  name?: string;
  invested?: number;
  contributions?: number;
  stateBenefit?: number;
  year?: number;
  monthlyDpp?: number;
};

type LegacyGoal = {
  id?: string;
  name?: string;
  invested?: number;
  contributions?: number;
};

type LegacyStock = {
  id?: string;
  ticker?: string;
  investedUsd?: number;
  contributionsUsd?: number;
  contributionsClp?: number;
};

type LegacyMp = {
  id?: string;
  name?: string;
  invested?: number;
  contributions?: number;
  annualRatePct?: number;
};

export function normalizeInvestment(raw: Partial<Investment>, index: number): Investment {
  const kind = raw.kind === 'apv' || raw.kind === 'stocks' || raw.kind === 'other' ? raw.kind : 'other';
  return {
    id: raw.id || `inv-${Date.now()}-${index}`,
    kind,
    provider: raw.provider?.trim() || 'Otro',
    name: raw.name?.trim() || '',
    invested: Number(raw.invested) || 0,
    contributions: Number(raw.contributions) || 0,
    stateBenefit: Number(raw.stateBenefit) || 0,
    year: Number(raw.year) || new Date().getFullYear(),
    monthlyDpp: Number(raw.monthlyDpp) || 0,
    ticker: raw.ticker?.trim() || '',
    investedUsd: Number(raw.investedUsd) || 0,
    contributionsUsd: Number(raw.contributionsUsd) || 0,
    contributionsClp: Number(raw.contributionsClp) || 0,
    annualRatePct: raw.annualRatePct != null ? Number(raw.annualRatePct) : undefined,
  };
}

function migrateFromLegacyInstruments(parsed: Record<string, unknown>): Investment[] {
  const result: Investment[] = [];
  const apv = parsed.fintualApv as LegacyApv | undefined;
  if (
    apv &&
    ((apv.invested ?? 0) > 0 ||
      (apv.contributions ?? 0) > 0 ||
      (apv.monthlyDpp ?? 0) > 0 ||
      (apv.stateBenefit ?? 0) > 0)
  ) {
    result.push(
      normalizeInvestment(
        {
          id: apv.id || 'inv-apv',
          kind: 'apv',
          provider: 'Fintual',
          name: 'APV',
          invested: apv.invested || 0,
          contributions: apv.contributions || 0,
          stateBenefit: apv.stateBenefit || 0,
          year: apv.year || new Date().getFullYear(),
          monthlyDpp: apv.monthlyDpp || 0,
        },
        result.length
      )
    );
  }

  for (const goal of (parsed.fintualGoals as LegacyGoal[] | undefined) || []) {
    result.push(
      normalizeInvestment(
        {
          id: goal.id,
          kind: 'other',
          provider: 'Fintual',
          name: goal.name || 'Inversión',
          invested: goal.invested || 0,
          contributions: goal.contributions || 0,
        },
        result.length
      )
    );
  }

  for (const stock of (parsed.stockHoldings as LegacyStock[] | undefined) || []) {
    result.push(
      normalizeInvestment(
        {
          id: stock.id,
          kind: 'stocks',
          provider: 'Fintual',
          name: stock.ticker || 'Acciones',
          ticker: stock.ticker || '',
          investedUsd: stock.investedUsd || 0,
          contributionsUsd: stock.contributionsUsd || 0,
          contributionsClp: stock.contributionsClp ?? (stock.id === 'stock-voo' ? 50000 : 0),
        },
        result.length
      )
    );
  }

  const mp = parsed.mercadoPago as LegacyMp | undefined;
  if (mp && ((mp.invested ?? 0) > 0 || (mp.contributions ?? 0) > 0)) {
    const isDefaultName = !mp.name || mp.name === 'Mercado Pago Cuenta Remunerada';
    result.push(
      normalizeInvestment(
        {
          id: mp.id || 'inv-mp',
          kind: 'other',
          provider: 'Mercado Pago',
          name: isDefaultName ? 'Cuenta remunerada' : mp.name,
          invested: mp.invested || 0,
          contributions: mp.contributions || 0,
          annualRatePct: mp.annualRatePct,
        },
        result.length
      )
    );
  }

  return result;
}

function migrateInvestments(parsed: Record<string, unknown>): Investment[] {
  if (Array.isArray(parsed.investments)) {
    return (parsed.investments as Partial<Investment>[]).map((item, i) => normalizeInvestment(item, i));
  }
  return migrateFromLegacyInstruments(parsed);
}

function inferHasCreditCard(parsed: Partial<AppState>): boolean {
  if (typeof parsed.hasCreditCard === 'boolean') return parsed.hasCreditCard;
  const card = parsed.creditCard;
  return Boolean(card && (card.billedAmount > 0 || card.averageBilled > 0 || card.creditUsed > 0));
}

function inferHasInvestments(parsed: Partial<AppState> & Record<string, unknown>): boolean {
  if (typeof parsed.hasInvestments === 'boolean') return parsed.hasInvestments;
  if (Array.isArray(parsed.investments) && parsed.investments.length > 0) return true;
  return migrateFromLegacyInstruments(parsed).length > 0;
}

function isMonthUndo(value: unknown): value is MonthAdvanceSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as MonthAdvanceSnapshot;
  return (
    typeof snapshot.startDate === 'string' &&
    typeof snapshot.currentCheckingBalance === 'number' &&
    typeof snapshot.billedAmount === 'number' &&
    Array.isArray(snapshot.installmentPurchases)
  );
}

export function isBudgetBackup(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const parsed = value as Record<string, unknown>;
  return parsed.currentCheckingBalance !== undefined && !!parsed.incomes && !!parsed.fixedExpenses;
}

export function hydrateState(parsed: Partial<AppState> & Record<string, unknown>): AppState {
  const empty = createEmptyState();
  const isLegacySave = parsed.onboardingCompleted === undefined && Array.isArray(parsed.incomes);
  const onboardingCompleted =
    typeof parsed.onboardingCompleted === 'boolean' ? parsed.onboardingCompleted : isLegacySave;

  const rest = { ...parsed };
  delete rest.fintualApv;
  delete rest.fintualGoals;
  delete rest.stockHoldings;
  delete rest.mercadoPago;
  delete rest.investments;

  return {
    ...empty,
    ...(rest as Partial<AppState>),
    onboardingCompleted,
    hasCreditCard: inferHasCreditCard(parsed),
    hasInvestments: inferHasInvestments(parsed),
    incomes: parsed.incomes || [],
    creditCard: {
      ...emptyCreditCard(),
      ...(parsed.creditCard || {}),
    },
    installmentPurchases: parsed.installmentPurchases || [],
    investments: migrateInvestments(parsed),
    dollarRate: typeof parsed.dollarRate === 'number' ? parsed.dollarRate : empty.dollarRate,
    creditCardEstimates: parsed.creditCardEstimates || {},
    monthUndo: isMonthUndo(parsed.monthUndo) ? parsed.monthUndo : undefined,
  };
}
