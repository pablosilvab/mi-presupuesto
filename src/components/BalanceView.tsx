'use client';

import React, { useEffect, useState } from 'react';
import { useBudget } from '@/context/BudgetContext';
import {
  calculateProjections,
  calculateInstallmentsSummary,
  formatCLP,
  formatMonthShort,
  monthKey,
  parseCLPInput,
  totalMonthlyDpp,
  isSalaryIncomeName,
} from '@/lib/utils';
import { Section, Button, Input, Amount, MoneyInput, ConfirmDialog } from './ui/design-system';
import { CreditCardEstimateInput } from './CreditCardEstimateInput';
import { MonthBreakdown } from './MonthBreakdown';

export function BalanceView({
  inspectedMonthKey,
  onInspectMonth,
}: {
  inspectedMonthKey: string;
  onInspectMonth: (key: string) => void;
}) {
  const {
    state,
    addIncome,
    updateIncome,
    deleteIncome,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    updateCreditCard,
    updateCreditCardEstimate,
    setHasCreditCard,
    addInstallmentPurchase,
    updateInstallmentPurchase,
    deleteInstallmentPurchase,
  } = useBudget();

  const [newIncomeName, setNewIncomeName] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [showAddIncome, setShowAddIncome] = useState(false);

  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);

  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [newInstDesc, setNewInstDesc] = useState('');
  const [newInstTotal, setNewInstTotal] = useState('6');
  const [newInstAmount, setNewInstAmount] = useState('');
  const [newInstInBilled, setNewInstInBilled] = useState(true);

  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editIncomeName, setEditIncomeName] = useState('');
  const [editIncomeAmount, setEditIncomeAmount] = useState('');

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseName, setEditExpenseName] = useState('');
  const [editExpenseAmount, setEditExpenseAmount] = useState('');

  const [simulatedCardAverage, setSimulatedCardAverage] = useState<number>(
    state.creditCard.averageBilled
  );
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [installmentToDelete, setInstallmentToDelete] = useState<{
    id: string;
    description: string;
  } | null>(null);

  const projections = calculateProjections(
    state,
    14,
    state.hasCreditCard ? simulatedCardAverage : undefined,
    true
  );
  const openMonthKey = projections.some((p) => monthKey(p.dateStr) === inspectedMonthKey)
    ? inspectedMonthKey
    : monthKey(projections[0]?.dateStr ?? state.startDate);

  useEffect(() => {
    document.getElementById(`month-${openMonthKey}`)?.scrollIntoView({ block: 'nearest' });
  }, [openMonthKey]);
  const installmentsSummary = calculateInstallmentsSummary(state.installmentPurchases || []);
  const monthlyDpp = totalMonthlyDpp(state.investments || []);
  const totalIncomes = state.incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalFixedExpenses = state.fixedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const isSimulatingCard =
    state.hasCreditCard && simulatedCardAverage !== state.creditCard.averageBilled;

  const handleCreateIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCLPInput(newIncomeAmount);
    if (newIncomeName.trim() && amount > 0) {
      addIncome(newIncomeName.trim(), amount);
      setNewIncomeName('');
      setNewIncomeAmount('');
      setShowAddIncome(false);
    }
  };

  const handleSaveEditIncome = (id: string) => {
    const amount = parseCLPInput(editIncomeAmount);
    if (editIncomeName.trim() && amount > 0) updateIncome(id, editIncomeName.trim(), amount);
    setEditingIncomeId(null);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCLPInput(newExpenseAmount);
    if (newExpenseName.trim() && amount > 0) {
      addFixedExpense(newExpenseName.trim(), amount);
      setNewExpenseName('');
      setNewExpenseAmount('');
      setShowAddExpense(false);
    }
  };

  const handleSaveEditExpense = (id: string) => {
    const amount = parseCLPInput(editExpenseAmount);
    if (editExpenseName.trim() && amount > 0) updateFixedExpense(id, editExpenseName.trim(), amount);
    setEditingExpenseId(null);
  };

  const handleCreateInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCLPInput(newInstAmount);
    const total = Number(newInstTotal) || 1;
    if (newInstDesc.trim() && amount > 0) {
      addInstallmentPurchase(newInstDesc.trim(), total, 1, amount, newInstInBilled);
      setNewInstDesc('');
      setNewInstTotal('6');
      setNewInstAmount('');
      setNewInstInBilled(true);
      setShowAddInstallment(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">Gastos</h1>
        <p className="mt-1 text-sm text-muted">
          {state.hasCreditCard ? 'Sueldos, fijos y tarjeta.' : 'Sueldos y gastos fijos.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section
          title="Ingresos"
          action={<Button onClick={() => setShowAddIncome(!showAddIncome)}>Agregar</Button>}
        >
          {showAddIncome && (
            <form onSubmit={handleCreateIncome} className="flex gap-3 mb-4">
              <Input
                type="text"
                placeholder="Concepto"
                value={newIncomeName}
                onChange={(e) => setNewIncomeName(e.target.value)}
                className="flex-1"
                required
              />
              <MoneyInput
                placeholder="$0"
                value={newIncomeAmount}
                onValueChange={(digits) => setNewIncomeAmount(digits)}
                className="w-36"
                required
              />
              <Button type="submit" variant="primary">
                Guardar
              </Button>
            </form>
          )}
          <table className="w-full text-[15px]">
            <tbody>
              {state.incomes.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="py-2.5 pr-2">
                    {editingIncomeId === item.id ? (
                      <Input value={editIncomeName} onChange={(e) => setEditIncomeName(e.target.value)} className="w-full" />
                    ) : (
                      <>
                        {item.name}
                        {isSalaryIncomeName(item.name) && monthlyDpp > 0 && (
                          <span className="block text-[13px] text-muted">
                            Incluye DPP de {formatCLP(monthlyDpp)} / mes
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    {editingIncomeId === item.id ? (
                      <MoneyInput
                        value={editIncomeAmount}
                        onValueChange={(digits) => setEditIncomeAmount(digits)}
                        className="w-32"
                      />
                    ) : (
                      <Amount tone="in">+{formatCLP(item.amount)}</Amount>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-[13px] text-muted whitespace-nowrap w-20">
                    {editingIncomeId === item.id ? (
                      <>
                        <Button variant="primary" onClick={() => handleSaveEditIncome(item.id)}>
                          Ok
                        </Button>{' '}
                        <Button onClick={() => setEditingIncomeId(null)}>✕</Button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingIncomeId(item.id);
                            setEditIncomeName(item.name);
                            setEditIncomeAmount(item.amount.toString());
                          }}
                          className="hover:text-ink"
                        >
                          editar
                        </button>
                        {' · '}
                        <button onClick={() => deleteIncome(item.id)} className="hover:text-danger">
                          borrar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="py-3 font-medium">Total</td>
                <td className="py-3 text-right">
                  <Amount tone="in" className="font-medium">
                    +{formatCLP(totalIncomes)}
                  </Amount>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </Section>

        <Section
          title="Gastos fijos"
          action={<Button onClick={() => setShowAddExpense(!showAddExpense)}>Agregar</Button>}
        >
          {showAddExpense && (
            <form onSubmit={handleCreateExpense} className="flex gap-3 mb-4">
              <Input
                placeholder="Concepto"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
                className="flex-1"
                required
              />
              <MoneyInput
                placeholder="$0"
                value={newExpenseAmount}
                onValueChange={(digits) => setNewExpenseAmount(digits)}
                className="w-36"
                required
              />
              <Button type="submit" variant="primary">
                Guardar
              </Button>
            </form>
          )}
          <table className="w-full text-[15px]">
            <tbody>
              {state.fixedExpenses.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="py-2.5">
                    {editingExpenseId === item.id ? (
                      <Input value={editExpenseName} onChange={(e) => setEditExpenseName(e.target.value)} className="w-full" />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    {editingExpenseId === item.id ? (
                      <MoneyInput
                        value={editExpenseAmount}
                        onValueChange={(digits) => setEditExpenseAmount(digits)}
                        className="w-32"
                      />
                    ) : (
                      <Amount tone="out">−{formatCLP(item.amount)}</Amount>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-[13px] text-muted w-20 whitespace-nowrap">
                    {editingExpenseId === item.id ? (
                      <>
                        <Button variant="primary" onClick={() => handleSaveEditExpense(item.id)}>
                          Ok
                        </Button>{' '}
                        <Button onClick={() => setEditingExpenseId(null)}>✕</Button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingExpenseId(item.id);
                            setEditExpenseName(item.name);
                            setEditExpenseAmount(item.amount.toString());
                          }}
                          className="hover:text-ink"
                        >
                          editar
                        </button>
                        {' · '}
                        <button onClick={() => deleteFixedExpense(item.id)} className="hover:text-danger">
                          borrar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="py-3 font-medium">Total</td>
                <td className="py-3 text-right">
                  <Amount tone="out" className="font-medium">
                    −{formatCLP(totalFixedExpenses)}
                  </Amount>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </Section>
      </div>

      {state.hasCreditCard ? (
      <Section
        title="Tarjeta y cuotas"
        action={<Button onClick={() => setShowAddInstallment(!showAddInstallment)}>Registrar cuota</Button>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8 text-[15px]">
          <div>
            <p className="text-[13px] text-muted mb-1">Facturado a pagar</p>
            <MoneyInput
              value={state.creditCard.billedAmount}
              onValueChange={(_, amount) => updateCreditCard({ billedAmount: amount })}
              className="w-full text-[16px]"
            />
            <p className="text-[13px] text-muted mt-1">Día {state.creditCard.paymentDay ?? 3}</p>
          </div>
          <div>
            <p className="text-[13px] text-muted mb-1">Gasto habitual, sin cuotas</p>
            <MoneyInput
              value={state.creditCard.averageBilled}
              onValueChange={(_, amount) => {
                updateCreditCard({ averageBilled: amount });
                setSimulatedCardAverage(amount);
              }}
              className="w-full text-[16px]"
            />
            <p className="text-[13px] text-muted mt-1">
              Los meses siguientes usan este monto, salvo un estimado propio.
            </p>
          </div>
          <div>
            <p className="text-[13px] text-muted mb-1">Cuotas activas</p>
            <p className="text-[16px] num pt-1">{formatCLP(installmentsSummary.totalMonthlyActive)} / mes</p>
            <p className="text-[13px] text-muted mt-1">
              Resta {formatCLP(installmentsSummary.totalPendingDebt)}
            </p>
          </div>
        </div>

        {showAddInstallment && (
          <form onSubmit={handleCreateInstallment} className="mb-6 space-y-3">
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Artículo"
                value={newInstDesc}
                onChange={(e) => setNewInstDesc(e.target.value)}
                className="flex-1 min-w-[140px]"
                required
              />
              <MoneyInput
                placeholder="$0"
                value={newInstAmount}
                onValueChange={(digits) => setNewInstAmount(digits)}
                className="w-36"
                required
              />
              <Input
                type="number"
                placeholder="N° cuotas"
                min={1}
                value={newInstTotal}
                onChange={(e) => setNewInstTotal(e.target.value)}
                className="w-24 text-right"
                required
              />
              <Button type="submit" variant="primary">
                Guardar
              </Button>
            </div>
            <label className="flex items-start gap-2 text-[13px] text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={newInstInBilled}
                onChange={(e) => setNewInstInBilled(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>
                La cuota de este mes ya está en el facturado. Si no, se suma también a{' '}
                {formatMonthShort(state.startDate)}.
              </span>
            </label>
          </form>
        )}

        <table className="w-full text-[15px]">
          <thead>
            <tr className="text-[13px] text-muted">
              <th className="pb-2 text-left font-normal">Compra</th>
              <th className="pb-2 text-left font-normal">Cuota</th>
              <th className="pb-2 text-right font-normal">Monto</th>
              <th className="pb-2 text-right font-normal">Resta</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {state.installmentPurchases?.map((p) => {
              const remaining = Math.max(0, p.totalInstallments - p.currentInstallment) * p.installmentAmount;
              return (
                <tr key={p.id} className="border-t border-line">
                  <td className="py-2.5">{p.description}</td>
                  <td className="py-2.5 text-muted">
                    {editingInstallmentId === p.id ? (
                      <span className="inline-flex items-baseline gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={p.totalInstallments}
                          autoFocus
                          value={p.currentInstallment}
                          onChange={(e) => {
                            const n = Math.min(
                              p.totalInstallments,
                              Math.max(1, Number(e.target.value) || 1)
                            );
                            updateInstallmentPurchase(p.id, { currentInstallment: n });
                          }}
                          onBlur={() => setEditingInstallmentId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          }}
                          className="w-14 text-right py-1"
                        />
                        <span>de {p.totalInstallments}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-baseline gap-2">
                        {p.currentInstallment} de {p.totalInstallments}
                        <button
                          type="button"
                          onClick={() => setEditingInstallmentId(p.id)}
                          className="text-[12px] hover:text-ink"
                        >
                          corregir
                        </button>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <Amount>{formatCLP(p.installmentAmount)}</Amount>
                  </td>
                  <td className="py-2.5 text-right">
                    <Amount tone="muted">{formatCLP(remaining)}</Amount>
                  </td>
                  <td className="py-2.5 text-right text-[13px] text-muted whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setInstallmentToDelete({ id: p.id, description: p.description })}
                      className="hover:text-danger"
                    >
                      borrar
                    </button>
                  </td>
                </tr>
              );
            })}
            {(!state.installmentPurchases || state.installmentPurchases.length === 0) && (
              <tr>
                <td colSpan={5} className="py-6 text-muted">
                  No hay compras en cuotas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>
      ) : (
        <Section title="Tarjeta y cuotas">
          <p className="text-sm text-muted">
            Este presupuesto usa solo la cuenta. No hay facturado ni cuotas de crédito.{' '}
            <button type="button" className="text-accent hover:underline" onClick={() => setHasCreditCard(true)}>
              Registrar tarjeta de crédito
            </button>
          </p>
        </Section>
      )}

      <Section title="Proyección mes a mes">
        <p className="text-[13px] text-muted -mt-2 mb-4">
          {state.hasCreditCard
            ? 'Toca un mes para ver de dónde sale el saldo. Ajusta solo los que se salen (marzo, diciembre…). Las cuotas se suman solas.'
            : 'Toca un mes para ver de dónde sale el saldo.'}
        </p>
        {state.hasCreditCard && (
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span>Simular gasto habitual de tarjeta</span>
              <input
                type="range"
                min="0"
                max="2500000"
                step="50000"
                value={simulatedCardAverage}
                onChange={(e) => setSimulatedCardAverage(Number(e.target.value))}
                className="w-40 accent-accent"
                aria-label="Simular gasto habitual de tarjeta"
              />
              <Amount>{formatCLP(simulatedCardAverage)}</Amount>
              {isSimulatingCard && (
                <>
                  <button
                    type="button"
                    className="text-[13px] text-accent hover:underline"
                    onClick={() => {
                      updateCreditCard({ averageBilled: simulatedCardAverage });
                    }}
                  >
                    usar como habitual
                  </button>
                  <button
                    type="button"
                    className="text-[13px] text-muted hover:text-ink"
                    onClick={() => setSimulatedCardAverage(state.creditCard.averageBilled)}
                  >
                    restablecer
                  </button>
                </>
              )}
            </div>
            {isSimulatingCard && (
              <p className="text-[13px] text-muted">
                La lista usa {formatCLP(simulatedCardAverage)}. El gasto habitual sigue en{' '}
                {formatCLP(state.creditCard.averageBilled)}.
              </p>
            )}
          </div>
        )}
        <ul>
          {projections.map((m) => {
            const key = monthKey(m.dateStr);
            const open = openMonthKey === key;
            return (
              <li id={`month-${key}`} key={m.dateStr} className="border-t border-line first:border-t-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onInspectMonth(key)}
                  className={`w-full flex items-baseline justify-between gap-4 py-3 text-left appearance-none ${
                    m.isFirstMonth ? 'font-medium' : ''
                  }`}
                >
                  <span>
                    {formatMonthShort(m.dateStr)}
                    {m.isFirstMonth && (
                      <span className="font-normal text-muted"> · este mes</span>
                    )}
                    {m.hasCustomCreditCardEstimate && (
                      <span className="block text-[12px] font-normal text-accent">estimado propio</span>
                    )}
                  </span>
                  <span
                    className={`num shrink-0 ${m.endingBalance < 0 ? 'text-danger' : 'text-ink'}`}
                  >
                    {formatCLP(m.endingBalance)}
                  </span>
                </button>
                {open && (
                  <div className="pb-4">
                    <MonthBreakdown
                      month={m}
                      extra={
                        !m.isFirstMonth && state.hasCreditCard && !isSimulatingCard ? (
                          <div className="mt-3 flex flex-wrap items-end gap-3">
                            <div>
                              <p className="text-[13px] text-muted mb-1">
                                Estimado de tarjeta (sin cuotas)
                              </p>
                              <CreditCardEstimateInput
                                value={m.creditCardBaseExpense}
                                onCommit={(amount) => updateCreditCardEstimate(key, amount)}
                                className="w-36 text-right"
                              />
                            </div>
                            <p className="text-[13px] text-muted pb-1.5">
                              Habitual {formatCLP(isSimulatingCard ? simulatedCardAverage : state.creditCard.averageBilled)}
                              {m.creditCardInstallments > 0 &&
                                ` · + cuotas ${formatCLP(m.creditCardInstallments)}`}
                            </p>
                            {m.hasCustomCreditCardEstimate && (
                              <Button variant="ghost" onClick={() => updateCreditCardEstimate(key, null)}>
                                Usar habitual
                              </Button>
                            )}
                          </div>
                        ) : undefined
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>
      {installmentToDelete && (
        <ConfirmDialog
          title="Borrar cuota"
          description={`Se quitará ${installmentToDelete.description} de la proyección.`}
          confirmLabel="Borrar"
          danger
          onConfirm={() => deleteInstallmentPurchase(installmentToDelete.id)}
          onClose={() => setInstallmentToDelete(null)}
        />
      )}
    </div>
  );
}
