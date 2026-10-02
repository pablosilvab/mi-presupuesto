'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MoneyInput } from './ui/design-system';
import { parseCLPInput } from '@/lib/utils';

export function CreditCardEstimateInput({
  value,
  onCommit,
  className = 'w-32 text-right',
}: {
  value: number;
  onCommit: (amount: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const valueRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  valueRef.current = value;
  onCommitRef.current = onCommit;

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw = draft) => {
    const amount = parseCLPInput(raw);
    if (amount !== valueRef.current) onCommitRef.current(amount);
  };

  useEffect(() => {
    const amount = parseCLPInput(draft);
    if (amount === valueRef.current) return;
    const t = window.setTimeout(() => commit(draft), 350);
    return () => window.clearTimeout(t);
  }, [draft]);

  return (
    <MoneyInput
      value={draft}
      onValueChange={(digits) => setDraft(digits)}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={className}
    />
  );
}
