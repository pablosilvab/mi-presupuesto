'use client';

import React, { useEffect, useState } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { Investment, InvestmentKind } from '@/types/budget';
import {
  calculateInvestmentSummary,
  calculateNetWorth,
  formatCLP,
  formatUSD,
  formatDollarClp,
  parseCLPInput,
  investmentTitle,
  investmentContributions,
  investmentMarketValue,
  investmentProfitClp,
  investmentProfitUsd,
  INVESTMENT_KIND_LABEL,
  PROVIDER_SUGGESTIONS,
} from '@/lib/utils';
import { Card, Section, Button, Input, ProfitAmount, MoneyInput, ConfirmDialog } from './ui/design-system';

type Draft = {
  provider: string;
  name: string;
  invested: string;
  contributions: string;
  stateBenefit: string;
  year: string;
  monthlyDpp: string;
  ticker: string;
  investedUsd: string;
  contributionsUsd: string;
  contributionsClp: string;
};

function emptyDraft(): Draft {
  return {
    provider: '',
    name: '',
    invested: '',
    contributions: '',
    stateBenefit: '',
    year: String(new Date().getFullYear()),
    monthlyDpp: '',
    ticker: '',
    investedUsd: '',
    contributionsUsd: '',
    contributionsClp: '',
  };
}

function draftFrom(inv: Investment): Draft {
  return {
    provider: inv.provider,
    name: inv.name,
    invested: String(inv.invested || 0),
    contributions: String(inv.contributions || 0),
    stateBenefit: String(inv.stateBenefit || 0),
    year: String(inv.year || new Date().getFullYear()),
    monthlyDpp: String(inv.monthlyDpp || 0),
    ticker: inv.ticker || '',
    investedUsd: String(inv.investedUsd || 0),
    contributionsUsd: String(inv.contributionsUsd || 0),
    contributionsClp: String(inv.contributionsClp || 0),
  };
}

function payloadFromDraft(kind: InvestmentKind, draft: Draft): Omit<Investment, 'id'> {
  const provider = draft.provider.trim();
  const ticker = draft.ticker.trim();
  return {
    kind,
    provider,
    name: kind === 'stocks' ? ticker || draft.name.trim() : draft.name.trim(),
    invested: parseCLPInput(draft.invested),
    contributions: parseCLPInput(draft.contributions),
    stateBenefit: parseCLPInput(draft.stateBenefit),
    year: Number(draft.year) || new Date().getFullYear(),
    monthlyDpp: parseCLPInput(draft.monthlyDpp),
    ticker,
    investedUsd: Number(draft.investedUsd) || 0,
    contributionsUsd: Number(draft.contributionsUsd) || 0,
    contributionsClp: parseCLPInput(draft.contributionsClp),
  };
}

export function InvestmentsView() {
  const { state, addInvestment, updateInvestment, deleteInvestment, dollarUpdatedAt } = useBudget();
  const invSummary = calculateInvestmentSummary(state);
  const netWorth = calculateNetWorth(state);
  const investments = state.investments || [];

  const [showAdd, setShowAdd] = useState(() => investments.length === 0);
  const [addKind, setAddKind] = useState<InvestmentKind>('other');
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft());
  const [selectedId, setSelectedId] = useState<string | null>(investments[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft());
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (selectedId && investments.some((inv) => inv.id === selectedId)) return;
    setSelectedId(investments[0]?.id ?? null);
    setEditingId(null);
  }, [investments, selectedId]);

  const selected = investments.find((inv) => inv.id === selectedId) || null;

  const resetAdd = () => {
    setShowAdd(false);
    setAddKind('other');
    setAddDraft(emptyDraft());
  };

  return (
    <div className="space-y-5">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Activos</h1>
            {investments.length === 0 ? (
              <p className="mt-3 text-sm text-muted max-w-md">
                Opcional. Si tienes APV, acciones o una cuenta que rinde, agrégala aquí para ver
                el patrimonio junto a tu liquidez.
              </p>
            ) : (
              <>
                <p className="mt-4 text-sm text-muted">Valor actual del portafolio</p>
                <p className="text-4xl leading-none tracking-tight num font-semibold mt-2 text-ink">
                  {formatCLP(invSummary.totalMarketValue)}
                </p>
                <p className="mt-3 text-sm text-muted">
                  Aportes {formatCLP(invSummary.totalContributions)} · ganancia{' '}
                  <ProfitAmount amount={invSummary.totalProfit} />
                </p>
              </>
            )}
          </div>
          <Button variant="primary" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cerrar' : 'Agregar activo'}
          </Button>
        </div>
        <div className="mt-6 pt-5 border-t border-line flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">Patrimonio</p>
            <p className="mt-1 text-[13px] text-muted">
              {state.hasCreditCard
                ? investments.length > 0
                  ? 'Cuenta + instrumentos − facturado de este corte'
                  : 'Cuenta − facturado de este corte'
                : investments.length > 0
                  ? 'Cuenta + instrumentos'
                  : 'Saldo en cuenta'}
            </p>
          </div>
          <p
            className={`text-2xl font-semibold tracking-tight num leading-none ${
              netWorth.netWorth < 0 ? 'text-danger' : 'text-ink'
            }`}
          >
            {netWorth.netWorth < 0
              ? `-${formatCLP(Math.abs(netWorth.netWorth))}`
              : formatCLP(netWorth.netWorth)}
          </p>
        </div>
        <datalist id="provider-suggestions">
          {PROVIDER_SUGGESTIONS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </Card>

      {showAdd && (
        <Section title="Nuevo activo">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!addDraft.provider.trim()) return;
              if (addKind === 'stocks' && !addDraft.ticker.trim()) return;
              const id = addInvestment(payloadFromDraft(addKind, addDraft));
              resetAdd();
              setSelectedId(id);
              setEditingId(null);
            }}
            className="space-y-5"
          >
            <div>
              <p className="text-[13px] text-muted mb-2">Tipo</p>
              <div className="flex flex-wrap gap-2">
                {(['apv', 'stocks', 'other'] as InvestmentKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setAddKind(kind)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border appearance-none ${
                      addKind === kind
                        ? 'border-accent bg-surface-2 text-ink'
                        : 'border-line text-muted hover:text-ink'
                    }`}
                  >
                    {INVESTMENT_KIND_LABEL[kind]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[13px] text-muted mb-1">Proveedor</p>
                <Input
                  list="provider-suggestions"
                  value={addDraft.provider}
                  onChange={(e) => setAddDraft({ ...addDraft, provider: e.target.value })}
                  placeholder="Fintual, Mercado Pago, Cuenta 2 AFP…"
                  className="w-full"
                  required
                />
              </div>
              {addKind === 'stocks' ? (
                <div>
                  <p className="text-[13px] text-muted mb-1">Ticker</p>
                  <Input
                    value={addDraft.ticker}
                    onChange={(e) => setAddDraft({ ...addDraft, ticker: e.target.value })}
                    placeholder="VOO"
                    className="w-full"
                    required
                  />
                </div>
              ) : (
                <div>
                  <p className="text-[13px] text-muted mb-1">
                    {addKind === 'apv' ? 'Etiqueta (opcional)' : 'Nombre'}
                  </p>
                  <Input
                    value={addDraft.name}
                    onChange={(e) => setAddDraft({ ...addDraft, name: e.target.value })}
                    placeholder={addKind === 'apv' ? 'Régimen A' : 'Cuenta remunerada, Auto…'}
                    className="w-full"
                  />
                </div>
              )}
            </div>
            <KindFields
              kind={addKind}
              draft={addDraft}
              onChange={setAddDraft}
              dollarRate={state.dollarRate}
              dollarUpdatedAt={dollarUpdatedAt}
            />
            <Button type="submit" variant="primary">
              Guardar
            </Button>
          </form>
        </Section>
      )}

      {investments.length > 0 && (
      <Section title="Instrumentos">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="text-[13px] text-muted">
              <th className="pb-2 pl-2.5 text-left font-normal border-l-2 border-transparent">Instrumento</th>
              <th className="pb-2 text-right font-normal">Aportes</th>
              <th className="pb-2 text-right font-normal">Valor</th>
              <th className="pb-2 text-right font-normal">Ganancia</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((inv) => {
              const contrib = investmentContributions(inv);
              const value = investmentMarketValue(inv, state.dollarRate);
              const profitClp = investmentProfitClp(inv, state.dollarRate);
              const profitUsd = investmentProfitUsd(inv);
              const isSelected = inv.id === selectedId;
              return (
                <tr
                  key={inv.id}
                  aria-selected={isSelected}
                  className={`border-t border-line border-l-2 cursor-pointer ${
                    isSelected
                      ? 'border-l-accent bg-surface-2'
                      : 'border-l-transparent hover:bg-canvas'
                  }`}
                  onClick={() => {
                    setSelectedId(inv.id);
                    if (editingId && editingId !== inv.id) setEditingId(null);
                  }}
                >
                  <td className={`py-2.5 pl-2.5 ${isSelected ? 'font-medium text-ink' : ''}`}>
                    {investmentTitle(inv)}
                    {inv.kind === 'stocks' && (
                      <span className="text-muted"> ({formatUSD(inv.investedUsd || 0)})</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right num">{formatCLP(contrib)}</td>
                  <td className="py-2.5 text-right num">{formatCLP(value)}</td>
                  <td className="py-2.5 text-right">
                    <ProfitWithUsd amountClp={profitClp} amountUsd={profitUsd} />
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-line">
              <td className="py-3 pl-2.5 font-medium border-l-2 border-transparent">Total</td>
              <td className="py-3 text-right num font-medium">
                {formatCLP(invSummary.totalContributions)}
              </td>
              <td className="py-3 text-right num font-medium">
                {formatCLP(invSummary.totalMarketValue)}
              </td>
              <td className="py-3 text-right font-medium">
                <ProfitAmount amount={invSummary.totalProfit} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>
      )}

      {selected && (
        <InvestmentDetail
          inv={selected}
          dollarRate={state.dollarRate}
          dollarUpdatedAt={dollarUpdatedAt}
          isEditing={editingId === selected.id}
          editDraft={editDraft}
          onEditDraft={setEditDraft}
          onStartEdit={() => {
            setEditingId(selected.id);
            setEditDraft(draftFrom(selected));
          }}
          onSave={() => {
            updateInvestment(selected.id, payloadFromDraft(selected.kind, editDraft));
            setEditingId(null);
          }}
          onCancelEdit={() => setEditingId(null)}
          onDelete={() => setConfirmDelete(true)}
        />
      )}
      {confirmDelete && selected && (
        <ConfirmDialog
          title="Borrar activo"
          description={`Se quitará ${investmentTitle(selected)} del portafolio.`}
          confirmLabel="Borrar"
          danger
          onConfirm={() => deleteInvestment(selected.id)}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function ProfitWithUsd({
  amountClp,
  amountUsd,
}: {
  amountClp: number;
  amountUsd: number | null;
}) {
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <ProfitAmount amount={amountClp} />
      {amountUsd !== null && (
        <span className="text-[13px] font-normal">
          <ProfitAmount amount={amountUsd} currency="USD" />
        </span>
      )}
    </span>
  );
}

function InvestmentDetail({
  inv,
  dollarRate,
  dollarUpdatedAt,
  isEditing,
  editDraft,
  onEditDraft,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
}: {
  inv: Investment;
  dollarRate: number;
  dollarUpdatedAt: string | null;
  isEditing: boolean;
  editDraft: Draft;
  onEditDraft: (draft: Draft) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const contrib = investmentContributions(inv);
  const value = investmentMarketValue(inv, dollarRate);
  const profitClp = investmentProfitClp(inv, dollarRate);
  const profitUsd = investmentProfitUsd(inv);

  return (
    <Section
      title={investmentTitle(inv)}
      action={
        <div className="flex items-center gap-2">
          <Button variant={isEditing ? 'primary' : 'default'} onClick={isEditing ? onSave : onStartEdit}>
            {isEditing ? 'Guardar' : 'Editar'}
          </Button>
          {!isEditing && <Button onClick={onDelete}>Borrar</Button>}
          {isEditing && <Button onClick={onCancelEdit}>✕</Button>}
        </div>
      }
    >
      <p className="text-[13px] text-muted -mt-2 mb-4">{INVESTMENT_KIND_LABEL[inv.kind]}</p>
      {isEditing ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[13px] text-muted mb-1">Proveedor</p>
              <Input
                list="provider-suggestions"
                value={editDraft.provider}
                onChange={(e) => onEditDraft({ ...editDraft, provider: e.target.value })}
                className="w-full"
              />
            </div>
            {inv.kind === 'stocks' ? (
              <div>
                <p className="text-[13px] text-muted mb-1">Ticker</p>
                <Input
                  value={editDraft.ticker}
                  onChange={(e) => onEditDraft({ ...editDraft, ticker: e.target.value })}
                  className="w-full"
                />
              </div>
            ) : (
              <div>
                <p className="text-[13px] text-muted mb-1">Nombre</p>
                <Input
                  value={editDraft.name}
                  onChange={(e) => onEditDraft({ ...editDraft, name: e.target.value })}
                  className="w-full"
                />
              </div>
            )}
          </div>
          <KindFields
            kind={inv.kind}
            draft={editDraft}
            onChange={onEditDraft}
            dollarRate={dollarRate}
            dollarUpdatedAt={dollarUpdatedAt}
          />
        </div>
      ) : inv.kind === 'stocks' ? (
        <table className="w-full text-[15px]">
          <tbody>
            <Detail label="Aportes" value={formatCLP(inv.contributionsClp || 0)} />
            <Detail label="USD comprados" value={formatUSD(inv.contributionsUsd || 0)} />
            <Detail label="Posición actual" value={formatUSD(inv.investedUsd || 0)} />
            <Detail
              label="En pesos"
              value={
                <span className="inline-flex flex-col items-end gap-0.5">
                  <span>{formatCLP(value)}</span>
                  <span
                    className="text-[13px] font-normal num"
                    title={
                      dollarUpdatedAt ? `Actualizado ${formatQuoteTime(dollarUpdatedAt)}` : undefined
                    }
                  >
                    <span className="text-muted">{formatUSD(inv.investedUsd || 0)} × </span>
                    <span className="text-ink">{formatDollarClp(dollarRate)}</span>
                  </span>
                </span>
              }
            />
            <Detail
              label="Ganancia"
              value={<ProfitWithUsd amountClp={profitClp} amountUsd={profitUsd} />}
              strong
            />
          </tbody>
        </table>
      ) : inv.kind === 'apv' ? (
        <table className="w-full text-[15px]">
          <tbody>
            <Detail label="Aportes" value={formatCLP(inv.contributions)} />
            <Detail label="Valor actual" value={formatCLP(inv.invested)} />
            <Detail label="Ganancia" value={<ProfitAmount amount={profitClp} />} />
            <Detail label="Beneficio del Estado" value={formatCLP(inv.stateBenefit || 0)} />
            <Detail
              label="DPP mensual (descuento de planilla)"
              value={`${formatCLP(inv.monthlyDpp || 0)} / mes`}
              strong
            />
          </tbody>
        </table>
      ) : (
        <table className="w-full text-[15px]">
          <tbody>
            <Detail label="Aportes" value={formatCLP(inv.contributions)} />
            <Detail label="Valor actual" value={formatCLP(inv.invested)} />
            <Detail label="Ganancia" value={<ProfitAmount amount={value - contrib} />} strong />
          </tbody>
        </table>
      )}
    </Section>
  );
}

function formatQuoteTime(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay ? `hoy, ${time}` : d.toLocaleDateString('es-CL', { dateStyle: 'short' }) + `, ${time}`;
}

function KindFields({
  kind,
  draft,
  onChange,
  dollarRate,
  dollarUpdatedAt,
}: {
  kind: InvestmentKind;
  draft: Draft;
  onChange: (next: Draft) => void;
  dollarRate?: number;
  dollarUpdatedAt?: string | null;
}) {
  if (kind === 'stocks') {
    const usd = Number(draft.investedUsd) || 0;
    const rate = dollarRate || 0;
    const converted = usd * rate;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          label="Aportes (CLP)"
          value={draft.contributionsClp}
          onChange={(v) => onChange({ ...draft, contributionsClp: v })}
        />
        <Field
          label="USD comprados"
          value={draft.contributionsUsd}
          onChange={(v) => onChange({ ...draft, contributionsUsd: v })}
          step="0.01"
        />
        <Field
          label="Posición actual (USD)"
          value={draft.investedUsd}
          onChange={(v) => onChange({ ...draft, investedUsd: v })}
          step="0.01"
          hint={
            rate > 0 ? (
              <span title={dollarUpdatedAt ? `Actualizado ${formatQuoteTime(dollarUpdatedAt)}` : undefined}>
                {usd > 0 ? `${formatCLP(converted)} · ` : null}
                dólar {formatDollarClp(rate)}
              </span>
            ) : null
          }
        />
      </div>
    );
  }

  if (kind === 'apv') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field
          label="Valor actual"
          value={draft.invested}
          onChange={(v) => onChange({ ...draft, invested: v })}
        />
        <Field
          label="Aportes"
          value={draft.contributions}
          onChange={(v) => onChange({ ...draft, contributions: v })}
        />
        <Field
          label="Beneficio Estado"
          value={draft.stateBenefit}
          onChange={(v) => onChange({ ...draft, stateBenefit: v })}
        />
        <Field
          label="DPP mensual"
          value={draft.monthlyDpp}
          onChange={(v) => onChange({ ...draft, monthlyDpp: v })}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field
        label="Valor actual"
        value={draft.invested}
        onChange={(v) => onChange({ ...draft, invested: v })}
      />
      <Field
        label="Aportes"
        value={draft.contributions}
        onChange={(v) => onChange({ ...draft, contributions: v })}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[13px] text-muted mb-1">{label}</p>
      {step ? (
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-right"
        />
      ) : (
        <MoneyInput value={value} onValueChange={(digits) => onChange(digits)} className="w-full" />
      )}
      {hint ? <p className="text-[12px] text-muted mt-1">{hint}</p> : null}
    </div>
  );
}

function Detail({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <tr className="border-t border-line">
      <td className={`py-2.5 ${strong ? 'font-medium' : 'text-muted'}`}>{label}</td>
      <td className={`py-2.5 text-right num ${strong ? 'font-medium' : ''}`}>{value}</td>
    </tr>
  );
}
