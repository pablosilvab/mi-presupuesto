'use client';

import React, { useEffect, useState } from 'react';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { Navbar } from '@/components/Navbar';
import { DashboardView } from '@/components/DashboardView';
import { BalanceView } from '@/components/BalanceView';
import { InvestmentsView } from '@/components/InvestmentsView';
import { OnboardingView } from '@/components/OnboardingView';
import { monthKey } from '@/lib/utils';

function AppShell() {
  const { state, isLoaded } = useBudget();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'balance' | 'investments'>('dashboard');
  const currentMonthKey = monthKey(state.startDate);
  const [inspectedMonthKey, setInspectedMonthKey] = useState(currentMonthKey);

  useEffect(() => {
    setInspectedMonthKey((key) => (!key || key < currentMonthKey ? currentMonthKey : key));
  }, [currentMonthKey]);

  if (!isLoaded) {
    return <div className="min-h-screen bg-canvas" />;
  }

  if (!state.onboardingCompleted) {
    return <OnboardingView />;
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-16">
        {activeTab === 'dashboard' && (
          <DashboardView
            inspectedMonthKey={inspectedMonthKey}
            onInspectMonth={setInspectedMonthKey}
            onNavigateToTab={(next) => setActiveTab(next)}
          />
        )}
        {activeTab === 'balance' && (
          <BalanceView inspectedMonthKey={inspectedMonthKey} onInspectMonth={setInspectedMonthKey} />
        )}
        {activeTab === 'investments' && <InvestmentsView />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <BudgetProvider>
      <AppShell />
    </BudgetProvider>
  );
}
