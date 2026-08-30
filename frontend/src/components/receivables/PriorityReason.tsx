'use client';

import React from 'react';
import { AlertTriangle, Clock, DollarSign, RefreshCw } from 'lucide-react';

interface PriorityReasonProps {
  daysOverdue: number;
  outstandingAmount: number;
  hasBrokenPromise?: boolean;
  hasOpenException?: boolean;
  isAiReasoning?: boolean;
}

export default function PriorityReason({
  daysOverdue,
  outstandingAmount,
  hasBrokenPromise = false,
  hasOpenException = false,
  isAiReasoning = false,
}: PriorityReasonProps) {
  const reasons: string[] = [];

  if (daysOverdue > 30) reasons.push(`${daysOverdue}d overdue`);
  else if (daysOverdue > 0) reasons.push(`${daysOverdue}d past due`);

  if (outstandingAmount >= 500000) reasons.push(`High balance`);

  if (hasBrokenPromise) reasons.push(`Broken promise`);

  if (hasOpenException) reasons.push(`Payment mismatch`);

  if (reasons.length === 0) reasons.push(`Standard terms`);

  return (
    <div className="flex flex-wrap gap-1 items-center text-[11px]">
      {reasons.map((r, i) => (
        <span
          key={i}
          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium"
        >
          {r}
        </span>
      ))}
      {isAiReasoning && (
        <span className="text-[10px] text-sky-700 font-semibold ml-1">
          Automated Signal
        </span>
      )}
    </div>
  );
}
