'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AppState,
  CreditCardData,
  InstallmentPurchase,
  Investment,
  OnboardingInput,
} from '@/types/budget';
import { createEmptyState, emptyCreditCard } from '@/data/initialData';
import { addMonths, calculateProjections } from '@/lib/utils';
import { loadDollarQuote, readDollarCache } from '@/lib/dollar';
import { STORAGE_KEY, hydrateState, isBudgetBackup, normalizeInvestment } from '@/lib/persist';

interface BudgetContextValue {
  state: AppState;
  isLoaded: boolean;
  dollarUpdatedAt: string | null;
  updateCheckingBalance: (balance: number) => void;
  advanceToNextMonth: (newBalance?: number, newBilled?: number) => void;
  rewindOneMonth: () => void;
  addIncome: (name: string, amount: number) => void;
  updateIncome: (id: string, name: string, amount: number) => void;
  deleteIncome: (id: string) => void;
  addFixedExpense: (name: string, amount: number, category?: string) => void;
  updateFixedExpense: (id: string, name: string, amount: number, category?: string) => void;
  deleteFixedExpense: (id: string) => void;
  updateCreditCard: (card: Partial<CreditCardData>) => void;
  addInstallmentPurchase: (
    description: string,
    totalInstallments: number,
    currentInstallment: number,
    installmentAmount: number,
    includedInCurrentBilled?: boolean,
    category?: string
  ) => void;
  updateInstallmentPurchase: (id: string, partial: Partial<InstallmentPurchase>) => void;
  deleteInstallmentPurchase: (id: string) => void;
  addInvestment: (investment: Omit<Investment, 'id'>) => string;
  updateInvestment: (id: string, partial: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  updateCreditCardEstimate: (monthKey: string, amount: number | null) => void;
  completeOnboarding: (input: OnboardingInput) => void;
  setHasCreditCard: (value: boolean) => void;
  resetToDefaults: () => void;
  exportDataJson: () => void;
  importDataJson: (jsonStr: string) => boolean;
}

const BudgetContext = createContext<BudgetContextValue | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(createEmptyState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [dollarUpdatedAt, setDollarUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let next = saved ? hydrateState(JSON.parse(saved)) : createEmptyState();
      const cachedQuote = readDollarCache();
      if (cachedQuote) {
        next = { ...next, dollarRate: cachedQuote.rate };
        setDollarUpdatedAt(cachedQuote.updatedAt);
      }
      setState(next);
    } catch (error) {
      console.error('Failed to load local budget data', error);
    } finally {
      setIsLoaded(true);
    }

    loadDollarQuote().then((quote) => {
      if (!quote) return;
      setDollarUpdatedAt(quote.updatedAt);
      setState((prev) => (prev.dollarRate === quote.rate ? prev : { ...prev, dollarRate: quote.rate }));
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save local budget data', error);
    }
  }, [state, isLoaded]);

  const updateCheckingBalance = (balance: number) => {
    setState((prev) => ({ ...prev, currentCheckingBalance: balance }));
  };

  const advanceToNextMonth = (newBalance?: number, newBilled?: number) => {
    setState((prev) => {
      const newStartDate = addMonths(prev.startDate, 1);
      const projectedEndingBalance =
        calculateProjections(prev, 1)[0]?.endingBalance ?? prev.currentCheckingBalance;
      const updatedPurchases = prev.installmentPurchases
        .map((purchase) => ({
          ...purchase,
          currentInstallment: purchase.currentInstallment + 1,
          includedInCurrentBilled: true,
        }))
        .filter((purchase) => purchase.currentInstallment <= purchase.totalInstallments);
      const nextMonthKey = newStartDate.slice(0, 7);
      const customBase = prev.creditCardEstimates?.[nextMonthKey];
      const nextBase = customBase !== undefined ? customBase : prev.creditCard.averageBilled;
      const activeInstallmentsSum = updatedPurchases.reduce(
        (sum, purchase) => sum + purchase.installmentAmount,
        0
      );
      const defaultNewBilled = nextBase + activeInstallmentsSum;

      return {
        ...prev,
        startDate: newStartDate,
        currentCheckingBalance: newBalance !== undefined ? newBalance : projectedEndingBalance,
        creditCard: {
          ...prev.creditCard,
          billedAmount: newBilled !== undefined ? newBilled : defaultNewBilled,
        },
        installmentPurchases: updatedPurchases,
        monthUndo: {
          startDate: prev.startDate,
          currentCheckingBalance: prev.currentCheckingBalance,
          billedAmount: prev.creditCard.billedAmount,
          installmentPurchases: prev.installmentPurchases.map((purchase) => ({ ...purchase })),
        },
      };
    });
  };

  const rewindOneMonth = () => {
    setState((prev) => {
      const undo = prev.monthUndo;
      if (!undo) return prev;
      return {
        ...prev,
        startDate: undo.startDate,
        currentCheckingBalance: undo.currentCheckingBalance,
        creditCard: {
          ...prev.creditCard,
          billedAmount: undo.billedAmount,
        },
        installmentPurchases: undo.installmentPurchases.map((purchase) => ({ ...purchase })),
        monthUndo: undefined,
      };
    });
  };

  const addIncome = (name: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      incomes: [...prev.incomes, { id: 'inc-' + Date.now(), name, amount }],
    }));
  };

  const updateIncome = (id: string, name: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      incomes: prev.incomes.map((item) => (item.id === id ? { ...item, name, amount } : item)),
    }));
  };

  const deleteIncome = (id: string) => {
    setState((prev) => ({
      ...prev,
      incomes: prev.incomes.filter((item) => item.id !== id),
    }));
  };

  const addFixedExpense = (name: string, amount: number, category: string = 'General') => {
    setState((prev) => ({
      ...prev,
      fixedExpenses: [
        ...prev.fixedExpenses,
        { id: 'fix-' + Date.now(), name, amount, category, paid: false },
      ],
    }));
  };

  const updateFixedExpense = (id: string, name: string, amount: number, category?: string) => {
    setState((prev) => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.map((item) =>
        item.id === id ? { ...item, name, amount, category: category || item.category } : item
      ),
    }));
  };

  const deleteFixedExpense = (id: string) => {
    setState((prev) => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.filter((item) => item.id !== id),
    }));
  };

  const updateCreditCard = (partial: Partial<CreditCardData>) => {
    setState((prev) => {
      const updated = { ...prev.creditCard, ...partial };
      if (partial.creditUsed !== undefined || partial.billedAmount !== undefined) {
        updated.periodExpenses = Math.max(0, updated.creditUsed - updated.billedAmount);
      }
      return { ...prev, creditCard: updated };
    });
  };

  const addInstallmentPurchase = (
    description: string,
    totalInstallments: number,
    currentInstallment: number,
    installmentAmount: number,
    includedInCurrentBilled: boolean = true,
    category: string = 'General'
  ) => {
    setState((prev) => ({
      ...prev,
      installmentPurchases: [
        ...(prev.installmentPurchases || []),
        {
          id: 'inst-' + Date.now(),
          description,
          totalInstallments,
          currentInstallment,
          installmentAmount,
          includedInCurrentBilled,
          category,
        },
      ],
    }));
  };

  const updateInstallmentPurchase = (id: string, partial: Partial<InstallmentPurchase>) => {
    setState((prev) => ({
      ...prev,
      installmentPurchases: (prev.installmentPurchases || []).map((purchase) =>
        purchase.id === id ? { ...purchase, ...partial } : purchase
      ),
    }));
  };

  const deleteInstallmentPurchase = (id: string) => {
    setState((prev) => ({
      ...prev,
      installmentPurchases: (prev.installmentPurchases || []).filter((purchase) => purchase.id !== id),
    }));
  };

  const addInvestment = (investment: Omit<Investment, 'id'>) => {
    const id = 'inv-' + Date.now();
    setState((prev) => ({
      ...prev,
      hasInvestments: true,
      investments: [
        ...prev.investments,
        normalizeInvestment({ ...investment, id }, prev.investments.length),
      ],
    }));
    return id;
  };

  const updateInvestment = (id: string, partial: Partial<Investment>) => {
    setState((prev) => ({
      ...prev,
      investments: prev.investments.map((inv) => (inv.id === id ? { ...inv, ...partial } : inv)),
    }));
  };

  const deleteInvestment = (id: string) => {
    setState((prev) => ({
      ...prev,
      investments: prev.investments.filter((inv) => inv.id !== id),
    }));
  };

  const updateCreditCardEstimate = (key: string, amount: number | null) => {
    setState((prev) => {
      const next = { ...(prev.creditCardEstimates || {}) };
      if (amount === null) {
        delete next[key];
      } else {
        next[key] = amount;
      }
      return { ...prev, creditCardEstimates: next };
    });
  };

  const completeOnboarding = (input: OnboardingInput) => {
    const empty = createEmptyState();
    setState((prev) => ({
      ...empty,
      onboardingCompleted: true,
      hasCreditCard: input.hasCreditCard,
      hasInvestments: false,
      currentCheckingBalance: input.currentCheckingBalance,
      startDate: input.startDate,
      dollarRate: prev.dollarRate,
      incomes: input.incomes.map((income, i) => ({
        id: 'inc-' + Date.now() + '-' + i,
        name: income.name,
        amount: income.amount,
      })),
      fixedExpenses: input.fixedExpenses.map((expense, i) => ({
        id: 'fix-' + Date.now() + '-' + i,
        name: expense.name,
        amount: expense.amount,
        category: 'General',
        paid: false,
      })),
      creditCard: input.hasCreditCard
        ? {
            ...emptyCreditCard(),
            billedAmount: input.billedAmount,
            averageBilled: input.averageBilled,
            paymentDay: input.paymentDay || 3,
            creditUsed: input.billedAmount,
            periodExpenses: 0,
          }
        : emptyCreditCard(),
    }));
  };

  const setHasCreditCard = (value: boolean) => {
    setState((prev) => ({ ...prev, hasCreditCard: value }));
  };

  const resetToDefaults = () => {
    setState(createEmptyState());
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportDataJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `mi-presupuesto-backup-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importDataJson = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!isBudgetBackup(parsed)) return false;
      setState(hydrateState(parsed));
      return true;
    } catch {
      return false;
    }
  };

  return (
    <BudgetContext.Provider
      value={{
        state,
        isLoaded,
        dollarUpdatedAt,
        updateCheckingBalance,
        advanceToNextMonth,
        rewindOneMonth,
        addIncome,
        updateIncome,
        deleteIncome,
        addFixedExpense,
        updateFixedExpense,
        deleteFixedExpense,
        updateCreditCard,
        addInstallmentPurchase,
        updateInstallmentPurchase,
        deleteInstallmentPurchase,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        updateCreditCardEstimate,
        completeOnboarding,
        setHasCreditCard,
        resetToDefaults,
        exportDataJson,
        importDataJson,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
