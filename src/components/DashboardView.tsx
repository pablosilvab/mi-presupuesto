'use client';

import React, { useEffect, useState } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { useTheme } from '@/context/ThemeContext';
import {
  calculateProjections,
  calculateInvestmentSummary,
  formatCLP,
  formatMonthTitle,
  formatMonthShort,
  monthKey,
  parseCLPInput,
  investmentTitle,
  investmentMarketValue,
} from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { Card, Section, Button, ProfitAmount, MoneyInput, Dialog, ConfirmDialog } from './ui/design-system';
import { CreditCardEstimateInput } from './CreditCardEstimateInput';
import { MonthBreakdown, BreakdownRow } from './MonthBreakdown';

interface DashboardViewProps {
  inspectedMonthKey: string;
  onInspectMonth: (key: string) => void;
  onNavigateToTab: (tab: 'dashboard' | 'balance' | 'investments') => void;
}

function useChartPalette() {
  const { theme } = useTheme();
  const [palette, setPalette] = useState({
    line: '#e5e7eb',
    muted: '#6b7280',
    accent: '#0f766e',
    surface: '#ffffff',
    ink: '#111827',
  });

  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    setPalette({
      line: s.getPropertyValue('--line').trim(),
      muted: s.getPropertyValue('--muted').trim(),
      accent: s.getPropertyValue('--accent').trim(),
      surface: s.getPropertyValue('--surface').trim(),
      ink: s.getPropertyValue('--ink').trim(),
    });
  }, [theme]);

  return palette;
}

function insightRest(endingBalance: number, netFlow: number, isProjection: boolean): string {
  if (endingBalance < 0) {
    return isProjection
      ? 'Ese mes la cuenta no alcanza.'
      : 'No alcanza a cubrir lo que hay que pagar.';
  }
  if (netFlow < 0) {
    return 'Alcanza, pero el saldo baja.';
  }
  return isProjection
    ? 'El saldo subiría después de cobrar y pagar.'
    : 'El saldo sube. Puedes gastarlo, ahorrarlo o invertirlo.';
}

export function DashboardView({ inspectedMonthKey, onInspectMonth, onNavigateToTab }: DashboardViewProps) {
  const {
    state,
    updateCheckingBalance,
    advanceToNextMonth,
    rewindOneMonth,
    updateCreditCardEstimate,
  } = useBudget();
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(state.currentCheckingBalance.toString());
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [confirmRewind, setConfirmRewind] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState('');
  const [advanceBilled, setAdvanceBilled] = useState('');
  const chart = useChartPalette();

  const projections = calculateProjections(state, 14);
  const invSummary = calculateInvestmentSummary(state);
  const selectedMonthIdx = Math.max(
    0,
    projections.findIndex((p) => monthKey(p.dateStr) === inspectedMonthKey)
  );
  const selectedMonth = projections[selectedMonthIdx] || projections[0];
  const currentMonth = projections[0];
  const outlook = projections.slice(0, 4);
  const hasInvestments = (state.investments || []).length > 0;
  const canUndoMonth = Boolean(state.monthUndo);
  const viewingProjection = selectedMonthIdx !== 0;
  const kicker = selectedMonth.isFirstMonth ? 'Después de cobrar y pagar' : 'Proyección';

  const inspectMonth = (idx: number) => {
    const month = projections[idx] || projections[0];
    if (month) onInspectMonth(monthKey(month.dateStr));
  };

  const chartData = projections.map((p) => ({
    name: formatMonthShort(p.dateStr),
    saldo: p.endingBalance,
    flujoNeto: p.netFlow,
  }));
  const selectedPoint = chartData[selectedMonthIdx];

  const handleSaveBalance = () => {
    const val = parseCLPInput(balanceInput);
    if (!isNaN(val)) updateCheckingBalance(val);
    setIsEditingBalance(false);
  };

  const handleOpenAdvanceModal = () => {
    const endingBal = projections[0]?.endingBalance ?? state.currentCheckingBalance;
    const nextInstAmount = projections[1]?.creditCardInstallments ?? 0;
    setAdvanceBalance(endingBal.toString());
    setAdvanceBilled(
      (projections[1]?.creditCardExpense ?? state.creditCard.averageBilled + nextInstAmount).toString()
    );
    setShowAdvanceModal(true);
  };

  const handleConfirmAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseCLPInput(advanceBalance);
    const billed = parseCLPInput(advanceBilled);
    advanceToNextMonth(
      isNaN(bal) ? undefined : bal,
      state.hasCreditCard ? (isNaN(billed) ? undefined : billed) : 0
    );
    setShowAdvanceModal(false);
    if (projections[1]) onInspectMonth(monthKey(projections[1].dateStr));
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-7">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1.1fr)_minmax(17rem,24rem)] sm:items-start">
          <div>
            <p className="text-sm text-muted">
              {formatMonthTitle(selectedMonth.dateStr)} · {kicker}
            </p>
            <p
              className={`mt-3 text-4xl sm:text-[2.75rem] font-semibold tracking-tight num leading-none ${
                selectedMonth.endingBalance < 0 ? 'text-danger' : 'text-ink'
              }`}
            >
              {formatCLP(selectedMonth.endingBalance)}
            </p>
            <p className="mt-4 text-sm text-muted max-w-md">
              <span className="num text-ink">{formatCLP(selectedMonth.startingBalance)}</span>
              <span className="mx-1.5 text-muted" aria-hidden>
                →
              </span>
              <span
                className={`num ${selectedMonth.endingBalance < 0 ? 'text-danger' : 'text-ink'}`}
              >
                {formatCLP(selectedMonth.endingBalance)}
              </span>
              <span>
                {' '}
                · {insightRest(selectedMonth.endingBalance, selectedMonth.netFlow, viewingProjection)}
              </span>
            </p>
          </div>

          <div className="sm:row-span-2">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-[13px] font-medium text-muted">Así se calcula</h2>
              <Button variant="ghost" onClick={() => onNavigateToTab('balance')}>
                Ajustar
              </Button>
            </div>
            <MonthBreakdown
              month={selectedMonth}
              isEditingBalance={isEditingBalance && selectedMonth.isFirstMonth}
              balanceInput={balanceInput}
              onBalanceInput={(digits) => setBalanceInput(digits)}
              onStartEdit={() => {
                setBalanceInput(state.currentCheckingBalance.toString());
                setIsEditingBalance(true);
              }}
              onSaveBalance={handleSaveBalance}
              onCancelEdit={() => setIsEditingBalance(false)}
            />
            {!selectedMonth.isFirstMonth && state.hasCreditCard && (
              <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-end gap-3">
                <div>
                  <p className="text-[13px] text-muted mb-1">Estimado de tarjeta (sin cuotas)</p>
                  <CreditCardEstimateInput
                    value={selectedMonth.creditCardBaseExpense}
                    onCommit={(amount) => updateCreditCardEstimate(monthKey(selectedMonth.dateStr), amount)}
                    className="w-36 text-right"
                  />
                </div>
                <p className="text-[13px] text-muted pb-1.5">
                  Habitual {formatCLP(state.creditCard.averageBilled)}
                  {selectedMonth.creditCardInstallments > 0 &&
                    ` · + cuotas ${formatCLP(selectedMonth.creditCardInstallments)}`}
                </p>
                {selectedMonth.hasCustomCreditCardEstimate && (
                  <Button
                    variant="ghost"
                    onClick={() => updateCreditCardEstimate(monthKey(selectedMonth.dateStr), null)}
                  >
                    Usar habitual
                  </Button>
                )}
              </div>
            )}
          </div>

          {viewingProjection ? (
            <p className="text-[13px] text-muted sm:self-end sm:pt-1">
              Estás viendo {formatMonthTitle(selectedMonth.dateStr)}.{' '}
              <button
                type="button"
                onClick={() => inspectMonth(0)}
                className="text-accent hover:underline"
              >
                Volver a {formatMonthShort(currentMonth.dateStr)}
              </button>
            </p>
          ) : (
            projections[1] && (
              <div className="flex flex-wrap items-center gap-2 sm:self-end sm:pt-1">
                <p className="text-[13px] text-muted mr-1 w-full sm:w-auto">
                  ¿Ya cobraste y pagaste {formatMonthShort(currentMonth.dateStr)}?
                </p>
                <Button type="button" variant="primary" onClick={handleOpenAdvanceModal}>
                  Pasar a {formatMonthShort(projections[1].dateStr)}
                </Button>
                {canUndoMonth && (
                  <button
                    type="button"
                    onClick={() => setConfirmRewind(true)}
                    className="text-[13px] text-muted hover:text-ink"
                  >
                    Deshacer paso de mes
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </Card>

      <Section title="Cómo sigue la cuenta">
        <p className="text-[13px] text-muted -mt-2 mb-4">
          Saldo estimado mes a mes, después de cobrar y pagar. Toca un mes para ver el detalle.
        </p>
        {outlook.length > 0 && (
          <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {outlook.map((month, idx) => {
              const selected = selectedMonthIdx === idx;
              return (
                <button
                  key={month.dateStr}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => inspectMonth(idx)}
                  className={`text-left rounded-xl px-3 py-3 border appearance-none transition-colors ${
                    selected
                      ? 'border-accent bg-surface-2'
                      : 'border-line bg-surface hover:border-ink/30'
                  }`}
                >
                  <p className="text-[13px] text-muted">
                    {idx === 0 ? 'Este mes' : formatMonthShort(month.dateStr)}
                  </p>
                  <p
                    className={`mt-1 text-[15px] font-medium num ${
                      month.endingBalance < 0 ? 'text-danger' : 'text-ink'
                    }`}
                  >
                    {formatCLP(month.endingBalance)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
        <div className="h-56 w-full cursor-pointer">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onClick={(d) => {
                if (typeof d?.activeTooltipIndex === 'number') {
                  inspectMonth(d.activeTooltipIndex);
                }
              }}
            >
              <CartesianGrid stroke={chart.line} vertical={false} />
              <XAxis dataKey="name" stroke={chart.muted} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke={chart.muted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-surface border border-line rounded-lg px-3 py-2 text-[13px] shadow-sm">
                      <p className="text-muted">{data.name}</p>
                      <p className="num font-medium text-ink">{formatCLP(data.saldo)}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke={chart.accent}
                strokeWidth={2}
                fill={chart.accent}
                fillOpacity={0.12}
              />
              {selectedPoint && (
                <ReferenceDot
                  x={selectedPoint.name}
                  y={selectedPoint.saldo}
                  r={5}
                  fill={chart.accent}
                  stroke={chart.surface}
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {hasInvestments ? (
        <Section
          title="Activos"
          action={
            <Button variant="ghost" onClick={() => onNavigateToTab('investments')}>
              Ver detalle
            </Button>
          }
        >
          <ul className="text-[15px]">
            {state.investments.map((inv) => (
              <BreakdownRow
                key={inv.id}
                label={investmentTitle(inv)}
                value={formatCLP(investmentMarketValue(inv, state.dollarRate))}
              />
            ))}
            <li className="flex items-baseline justify-between gap-4 border-t border-line pt-3 mt-1">
              <span className="text-muted">Ganancia</span>
              <ProfitAmount amount={invSummary.totalProfit} />
            </li>
            <li className="flex items-baseline justify-between gap-4 pt-2">
              <span className="font-semibold">Total</span>
              <span className="num font-semibold">{formatCLP(invSummary.totalMarketValue)}</span>
            </li>
          </ul>
        </Section>
      ) : (
        <p className="text-sm text-muted">
          ¿Tienes APV o acciones?{' '}
          <button
            type="button"
            onClick={() => onNavigateToTab('investments')}
            className="text-accent hover:underline"
          >
            Agrégalas en Activos
          </button>
        </p>
      )}

      {showAdvanceModal && projections[1] && (
        <Dialog
          title={`Cerrar mes y pasar a ${formatMonthTitle(projections[1].dateStr)}`}
          onClose={() => setShowAdvanceModal(false)}
        >
          <p className="text-[13px] text-muted mt-1 mb-5">
            {state.hasCreditCard
              ? 'Las cuotas avanzan un mes.'
              : 'El mes avanza; el saldo se actualiza.'}
          </p>
          <form onSubmit={handleConfirmAdvance} className="space-y-4">
            <div>
              <label className="text-[13px] text-muted block mb-1">
                Saldo inicial en {formatMonthShort(projections[1].dateStr)}
              </label>
              <MoneyInput
                value={advanceBalance}
                onValueChange={(digits) => setAdvanceBalance(digits)}
                className="w-full"
                required
              />
            </div>
            {state.hasCreditCard && (
              <div>
                <label className="text-[13px] text-muted block mb-1">Facturado de tarjeta</label>
                <MoneyInput
                  value={advanceBilled}
                  onValueChange={(digits) => setAdvanceBilled(digits)}
                  className="w-full"
                  required
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setShowAdvanceModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Confirmar
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {confirmRewind && (
        <ConfirmDialog
          title="Deshacer el paso de mes"
          description="Se restaura la fecha, el saldo de la cuenta, el facturado y las cuotas de antes de pasar de mes."
          confirmLabel="Deshacer"
          onConfirm={() => {
            const undoDate = state.monthUndo?.startDate;
            rewindOneMonth();
            if (undoDate) onInspectMonth(monthKey(undoDate));
          }}
          onClose={() => setConfirmRewind(false)}
        />
      )}
    </div>
  );
}
