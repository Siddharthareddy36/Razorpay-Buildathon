'use client';

import React from 'react';
import { ShieldAlert, AlertCircle, Clock } from 'lucide-react';

interface PriorityBadgeProps {
  priority?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  daysOverdue?: number;
  isAiGenerated?: boolean;
}

export default function PriorityBadge({ priority, daysOverdue = 0, isAiGenerated = false }: PriorityBadgeProps) {
  const p = priority?.toUpperCase() || (daysOverdue > 30 ? 'HIGH' : daysOverdue > 14 ? 'MEDIUM' : 'LOW');

  if (p === 'HIGH') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs">
        <ShieldAlert className="w-3.5 h-3.5 mr-1 shrink-0 text-rose-600" />
        HIGH {isAiGenerated && <span className="ml-1 text-[9px] bg-rose-100 px-1 rounded text-rose-800 font-mono">AI</span>}
      </span>
    );
  }

  if (p === 'MEDIUM') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700 shadow-2xs">
        <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0 text-amber-600" />
        MEDIUM {isAiGenerated && <span className="ml-1 text-[9px] bg-amber-100 px-1 rounded text-amber-800 font-mono">AI</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
      <Clock className="w-3.5 h-3.5 mr-1 shrink-0 text-slate-500" />
      LOW {isAiGenerated && <span className="ml-1 text-[9px] bg-slate-200 px-1 rounded text-slate-700 font-mono">AI</span>}
    </span>
  );
}
