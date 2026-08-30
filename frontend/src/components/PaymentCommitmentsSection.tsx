'use client';

import React from 'react';
import { PromiseItem } from '../types';
import { Clock, CheckCircle2, XCircle, AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface PaymentCommitmentsSectionProps {
  promises: PromiseItem[];
  loading?: boolean;
}

export default function PaymentCommitmentsSection({ promises, loading }: PaymentCommitmentsSectionProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'fulfilled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          FULFILLED
        </span>
      );
    }
    if (s === 'broken') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <XCircle className="w-3 h-3 mr-1" />
          BROKEN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
        <Clock className="w-3 h-3 mr-1" />
        ACTIVE
      </span>
    );
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Payment Commitments
            <span className="px-2 py-0.5 bg-slate-800 text-sky-400 font-mono text-[10px] rounded border border-slate-700">
              Promise-to-Pay Monitored
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Customer promises and commitment fulfillment tracking</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-800/50 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : promises.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No customer payment commitments currently recorded.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promises.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors flex justify-between items-center"
            >
              <div>
                <div className="text-sm font-bold text-white">{formatCurrency(item.promised_amount)}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Due: <span className="text-slate-200 font-medium">{new Date(item.promised_date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end space-y-1">
                {getStatusBadge(item.status)}
                <Link
                  href={`/invoices/${item.invoice_id}`}
                  className="text-[11px] font-semibold text-sky-400 hover:underline inline-flex items-center mt-1"
                >
                  Invoice Case
                  <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
