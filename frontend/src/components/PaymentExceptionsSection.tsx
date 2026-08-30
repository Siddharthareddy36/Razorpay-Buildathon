'use client';

import React, { useState } from 'react';
import { ReconciliationExceptionItem } from '../types';
import { AlertOctagon, ArrowUpRight, Cpu } from 'lucide-react';
import Link from 'next/link';
import ReconciliationIntelligenceCard from './ReconciliationIntelligenceCard';

interface PaymentExceptionsSectionProps {
  exceptions: ReconciliationExceptionItem[];
  loading?: boolean;
}

export default function PaymentExceptionsSection({ exceptions, loading }: PaymentExceptionsSectionProps) {
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Payment Exceptions
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 font-mono text-[10px] rounded border border-purple-500/30">
              Reconciliation Discrepancies
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Short-pays, withholding tax deductions, and gateway fee mismatches</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/50 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : exceptions.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No reconciliation exceptions currently open.
        </div>
      ) : (
        <div className="space-y-3">
          {exceptions.map((ex) => {
            const discrepancy = ex.difference ?? ex.discrepancy_amount ?? (ex.expected_amount - ex.received_amount);
            const hypothesis = ex.ai_hypothesis || ex.reason || ex.exception_type || 'Possible TDS Deduction';

            return (
              <div
                key={ex.id}
                className="p-4 bg-slate-950/60 rounded-xl border border-purple-900/40 hover:border-purple-800 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">Discrepancy: {formatCurrency(discrepancy)}</span>
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-semibold uppercase rounded">
                      {ex.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-400">
                    <span>Expected: <strong className="text-slate-200">{formatCurrency(ex.expected_amount)}</strong></span>
                    <span>Received: <strong className="text-emerald-400">{formatCurrency(ex.received_amount)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs max-w-xs">
                    <span className="text-[10px] text-slate-400 block font-mono">Likely Reason:</span>
                    <span className="font-medium text-amber-300 truncate block">{hypothesis}</span>
                  </div>

                  <button
                    onClick={() => setSelectedExceptionId(ex.id)}
                    className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 font-bold text-xs rounded-xl transition-colors shrink-0 inline-flex items-center gap-1"
                  >
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    Reconciliation Agent
                  </button>

                  <Link
                    href={`/invoices/${ex.invoice_id}`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors shrink-0 inline-flex items-center"
                  >
                    Invoice Case
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal View for Reconciliation Intelligence */}
      {selectedExceptionId && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-2xl w-full">
            <ReconciliationIntelligenceCard
              exceptionId={selectedExceptionId}
              onClose={() => setSelectedExceptionId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

