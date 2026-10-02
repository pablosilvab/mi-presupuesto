'use client';

import React from 'react';
import { useBudget } from '@/context/BudgetContext';
import { formatCLP } from '@/lib/utils';
import { Amount, Button, MoneyInput } from './ui/design-system';
import type { ProjectionMonth } from '@/types/budget';

export function MonthBreakdown({
  month,
  isEditingBalance = false,
  balanceInput = '',
  onBalanceInput,
  onStartEdit,
  onSaveBalance,
  onCancelEdit,
  extra,
}: {
  month: ProjectionMonth;
  isEditingBalance?: boolean;
  balanceInput?: string;
  onBalanceInput?: (digits: string) => void;
  onStartEdit?: () => void;
  onSaveBalance?: () => void;
  onCancelEdit?: () => void;
  extra?: React.ReactNode;
}) {
  const { state } = useBudget();

  return (
    <div>
      <ul className="text-[15px] rounded-xl bg-surface-2 border border-line px-4 py-1">
        <BreakdownRow
          label="Saldo de partida"
          hint={
            month.isFirstMonth ? 'Lo que hay hoy en la cuenta' : 'Lo que arrastras del mes anterior'
          }
          value={
            isEditingBalance ? (
              <span className="inline-flex items-center gap-2">
                <MoneyInput
                  value={balanceInput}
                  onValueChange={(digits) => onBalanceInput?.(digits)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveBalance?.();
                    if (e.key === 'Escape') onCancelEdit?.();
                  }}
                  className="w-32"
                  autoFocus
                />
                <Button variant="primary" onClick={onSaveBalance}>
                  Guardar
                </Button>
              </span>
            ) : (
              formatCLP(month.startingBalance)
            )
          }
          action={
            month.isFirstMonth && !isEditingBalance && onStartEdit ? (
              <button type="button" onClick={onStartEdit} className="text-[13px] text-accent hover:underline">
                editar
              </button>
            ) : undefined
          }
        />
        <BreakdownRow
          label="Ingresos"
          hint={state.incomes.map((i) => i.name).filter(Boolean).slice(0, 3).join(', ') || undefined}
          value={`+${formatCLP(month.incomes)}`}
          tone="in"
        />
        <BreakdownRow
          label="Gastos fijos"
          hint={
            state.fixedExpenses.length
              ? `${state.fixedExpenses.length} ${state.fixedExpenses.length === 1 ? 'compromiso' : 'compromisos'}`
              : 'Sin gastos fijos'
          }
          value={`−${formatCLP(month.fixedExpenses)}`}
          tone="out"
        />
        {state.hasCreditCard && (
          <>
            <BreakdownRow
              label={month.isFirstMonth ? 'Tarjeta facturada' : 'Estimado de tarjeta'}
              hint={
                month.isFirstMonth
                  ? month.activeInstallments.some((inst) => !inst.addsToExpense)
                    ? `Incluye ${month.activeInstallments
                        .filter((inst) => !inst.addsToExpense)
                        .map((inst) => `${inst.description} ${inst.currentNumber}/${inst.totalNumber}`)
                        .join(', ')}`
                    : 'A pagar este corte'
                  : month.hasCustomCreditCardEstimate
                    ? 'Estimado de este mes, sin cuotas'
                    : 'Gasto habitual, sin cuotas'
              }
              value={`−${formatCLP(month.creditCardBaseExpense)}`}
              tone="out"
            />
            {month.activeInstallments
              .filter((inst) => inst.addsToExpense)
              .map((inst) => (
                <BreakdownRow
                  key={inst.id}
                  label={`${inst.description} ${inst.currentNumber}/${inst.totalNumber}`}
                  hint="Cuota de tarjeta"
                  value={`−${formatCLP(inst.amount)}`}
                  tone="out"
                />
              ))}
          </>
        )}
        <li className="flex items-baseline justify-between gap-4 border-t-2 border-line pt-3 mt-1 pb-3">
          <span className="font-semibold">Disponible</span>
          <Amount className="text-base font-semibold">{formatCLP(month.endingBalance)}</Amount>
        </li>
      </ul>
      {extra}
    </div>
  );
}

export function BreakdownRow({
  label,
  hint,
  value,
  action,
  tone = 'default',
}: {
  label: string;
  hint?: string;
  value: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'in' | 'out' | 'default';
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 py-2 border-t border-line first:border-t-0 first:pt-3">
      <span>
        {label}
        {action && <span className="ml-2">{action}</span>}
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
      <Amount tone={tone} className="shrink-0">
        {value}
      </Amount>
    </li>
  );
}
