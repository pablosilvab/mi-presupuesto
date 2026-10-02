import React, { useEffect } from 'react';
import { formatCLP, formatSignedCLP, formatSignedUSD, parseCLPInput, profitTone } from '@/lib/utils';

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-line rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} action={action} />
      {children}
    </Card>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
}

export function Button({
  children,
  variant = 'default',
  className = '',
  ...props
}: ButtonProps) {
  const styles =
    variant === 'primary'
      ? 'bg-accent text-accent-fg hover:opacity-90'
      : variant === 'ghost'
        ? 'text-muted hover:text-ink hover:bg-surface-2'
        : variant === 'danger'
          ? 'bg-danger text-white hover:opacity-90'
          : 'border border-line bg-surface text-ink hover:bg-surface-2';

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 text-[13px] font-medium rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-40 transition-colors appearance-none ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-[14px] text-ink num focus:outline-none focus:border-accent ${className}`}
      {...props}
    />
  );
}

export function MoneyInput({
  value,
  onValueChange,
  className = '',
  ...props
}: {
  value: string | number;
  onValueChange: (digits: string, amount: number) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const isEmpty = value === '' || value === undefined || value === null;
  const amount = isEmpty ? 0 : typeof value === 'number' ? value : parseCLPInput(value);
  const display = isEmpty ? '' : formatCLP(amount);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={(e) => {
        const next = parseCLPInput(e.target.value);
        const digits = String(e.target.value).replace(/\D/g, '');
        onValueChange(digits, next);
      }}
      {...props}
      className={`text-right ${className}`}
    />
  );
}

export function Amount({
  children,
  tone = 'default',
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'in' | 'out' | 'muted';
  className?: string;
}) {
  const color =
    tone === 'in'
      ? 'text-income'
      : tone === 'out'
        ? 'text-danger'
        : tone === 'muted'
          ? 'text-muted'
          : 'text-ink';

  return <span className={`num ${color} ${className}`}>{children}</span>;
}

export function ProfitAmount({
  amount,
  currency = 'CLP',
  className = '',
}: {
  amount: number;
  currency?: 'CLP' | 'USD';
  className?: string;
}) {
  const formatted = currency === 'USD' ? formatSignedUSD(amount) : formatSignedCLP(amount);
  return (
    <Amount tone={profitTone(amount)} className={className}>
      {formatted}
    </Amount>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        className="bg-surface w-full max-w-md p-6 rounded-xl border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="app-dialog-title" className="text-base font-semibold text-ink">
          {title}
        </h3>
        {children}
        {footer ? <div className="flex justify-end gap-2 mt-5">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-muted mt-1">{description}</p>
    </Dialog>
  );
}
