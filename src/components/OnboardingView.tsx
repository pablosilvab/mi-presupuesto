'use client';

import React, { useState } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { useTheme } from '@/context/ThemeContext';
import { todayDateStr } from '@/data/initialData';
import { parseCLPInput } from '@/lib/utils';
import { Button, Input, Card, MoneyInput } from './ui/design-system';
import { Moon, Sun } from 'lucide-react';

type NamedAmount = { name: string; amount: string };

function Choice({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border appearance-none transition-colors ${
        selected ? 'border-accent bg-surface-2' : 'border-line bg-surface hover:border-ink/30'
      }`}
    >
      <p className="font-medium text-ink">{title}</p>
      <p className="text-[13px] text-muted mt-1">{description}</p>
    </button>
  );
}

export function OnboardingView() {
  const { completeOnboarding } = useBudget();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState(0);

  const [balance, setBalance] = useState('');
  const [startDate, setStartDate] = useState(todayDateStr());

  const [incomes, setIncomes] = useState<NamedAmount[]>([{ name: 'Sueldo líquido', amount: '' }]);
  const [expenses, setExpenses] = useState<NamedAmount[]>([{ name: '', amount: '' }]);

  const [hasCreditCard, setHasCreditCard] = useState<boolean | null>(null);
  const [billedAmount, setBilledAmount] = useState('');
  const [averageBilled, setAverageBilled] = useState('');
  const [paymentDay, setPaymentDay] = useState('3');

  const parseAmount = (raw: string) => parseCLPInput(raw);

  const usableIncomes = incomes.filter((i) => i.name.trim() && parseAmount(i.amount) > 0);
  const usableExpenses = expenses.filter((e) => e.name.trim() && parseAmount(e.amount) > 0);

  const canNext =
    step === 0
      ? Boolean(startDate)
      : step === 1
        ? usableIncomes.length > 0
        : hasCreditCard !== null &&
          (!hasCreditCard || (parseAmount(billedAmount) >= 0 && parseAmount(averageBilled) >= 0));

  const finish = () => {
    if (hasCreditCard === null) return;
    completeOnboarding({
      currentCheckingBalance: parseAmount(balance),
      startDate,
      incomes: usableIncomes.map((i) => ({ name: i.name.trim(), amount: parseAmount(i.amount) })),
      fixedExpenses: usableExpenses.map((e) => ({ name: e.name.trim(), amount: parseAmount(e.amount) })),
      hasCreditCard,
      billedAmount: parseAmount(billedAmount),
      averageBilled: parseAmount(averageBilled),
      paymentDay: Number(paymentDay) || 3,
    });
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-[15px]">Mi Presupuesto</span>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-line text-ink hover:bg-surface-2"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8 pb-16">
        <p className="text-[13px] text-muted mb-2">Paso {step + 1} de 3</p>
        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-line'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <Card className="p-6 space-y-5">
            <div>
              <h1 className="text-xl font-semibold">Empecemos con tu cuenta</h1>
              <p className="text-sm text-muted mt-2">
                Vamos a calcular cuánto te queda en cuenta después de cobrar y pagar el mes.
              </p>
            </div>
            <div>
              <p className="text-[13px] text-muted mb-1">Saldo actual en cuenta</p>
              <MoneyInput
                value={balance}
                onValueChange={(digits) => setBalance(digits)}
                placeholder="$0"
                className="w-full"
              />
            </div>
            <div>
              <p className="text-[13px] text-muted mb-1">Fecha de corte (día en que sueles pagar)</p>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
                required
              />
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-6 space-y-6">
            <div>
              <h1 className="text-xl font-semibold">Ingresos y gastos fijos</h1>
              <p className="text-sm text-muted mt-2">
                Al menos un ingreso. Los gastos fijos (dividendo, servicios) son opcionales.
              </p>
            </div>
            <div>
              <p className="text-[13px] font-medium mb-2">Ingresos mensuales</p>
              <div className="space-y-2">
                {incomes.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="Concepto"
                      value={row.name}
                      onChange={(e) =>
                        setIncomes(incomes.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))
                      }
                      className="flex-1"
                    />
                    <MoneyInput
                      placeholder="$0"
                      value={row.amount}
                      onValueChange={(digits) =>
                        setIncomes(incomes.map((r, j) => (j === i ? { ...r, amount: digits } : r)))
                      }
                      className="w-36"
                    />
                  </div>
                ))}
              </div>
              <Button
                className="mt-2"
                onClick={() => setIncomes([...incomes, { name: '', amount: '' }])}
              >
                Agregar ingreso
              </Button>
            </div>
            <div>
              <p className="text-[13px] font-medium mb-2">Gastos fijos</p>
              <div className="space-y-2">
                {expenses.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="Concepto"
                      value={row.name}
                      onChange={(e) =>
                        setExpenses(expenses.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))
                      }
                      className="flex-1"
                    />
                    <MoneyInput
                      placeholder="$0"
                      value={row.amount}
                      onValueChange={(digits) =>
                        setExpenses(expenses.map((r, j) => (j === i ? { ...r, amount: digits } : r)))
                      }
                      className="w-36"
                    />
                  </div>
                ))}
              </div>
              <Button
                className="mt-2"
                onClick={() => setExpenses([...expenses, { name: '', amount: '' }])}
              >
                Agregar gasto
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-4">
            <div>
              <h1 className="text-xl font-semibold">¿Cómo pagas el día a día?</h1>
              <p className="text-sm text-muted mt-2">
                Si todo sale de la cuenta, no proyectamos factura de tarjeta. Si usas crédito,
                sí: facturado de este mes y un gasto habitual para los siguientes.
              </p>
            </div>
            <Choice
              selected={hasCreditCard === false}
              title="Solo débito / cuenta corriente"
              description="Los gastos fijos salen de la cuenta. Sin ciclo de tarjeta."
              onClick={() => setHasCreditCard(false)}
            />
            <Choice
              selected={hasCreditCard === true}
              title="Uso tarjeta de crédito"
              description="Hay un facturado a pagar este mes y un estimado para los siguientes."
              onClick={() => setHasCreditCard(true)}
            />
            {hasCreditCard && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <p className="text-[13px] text-muted mb-1">Facturado este mes</p>
                  <MoneyInput
                    value={billedAmount}
                    onValueChange={(digits) => setBilledAmount(digits)}
                    className="w-full"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <p className="text-[13px] text-muted mb-1">Gasto habitual</p>
                  <MoneyInput
                    value={averageBilled}
                    onValueChange={(digits) => setAverageBilled(digits)}
                    className="w-full"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <p className="text-[13px] text-muted mb-1">Día de pago</p>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={paymentDay}
                    onChange={(e) => setPaymentDay(e.target.value)}
                    className="w-full text-right"
                  />
                </div>
              </div>
            )}
          </Card>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            Atrás
          </Button>
          {step < 2 ? (
            <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!canNext}>
              Continuar
            </Button>
          ) : (
            <Button variant="primary" onClick={finish} disabled={!canNext}>
              Ver cuánto me queda
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
