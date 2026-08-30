'use client';

import React, { useEffect, useState } from 'react';
import ChatbotShell from '../../components/ChatbotShell';
import { fetchDashboardSummary } from '../../lib/api';
import { formatCompactCurrency } from '../../lib/formatters';
import { DashboardSummary } from '../../types';
import { Bot, Sparkles, ShieldCheck, HelpCircle, DollarSign, Clock, AlertOctagon, TrendingUp } from 'lucide-react';

export default function AssistantPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    fetchDashboardSummary()
      .then(setSummary)
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-5 text-slate-800">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Receivables Assistant</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Ask questions about invoices, customers, commitments, and payment exceptions.</p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600 font-semibold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <Sparkles className="w-4 h-4 text-sky-700" />
          <span>Financial Intelligence Assistant</span>
        </div>
      </div>

      {/* Main Grid: Chat Shell + Desktop Context Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Chat Shell */}
        <div className="lg:col-span-2">
          <ChatbotShell />
        </div>

        {/* Right Col: Current Portfolio Context Panel */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-700" />
                Current Portfolio
              </h2>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                Active Ledger
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Total Outstanding</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {formatCompactCurrency(summary?.outstandingAmount)}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Overdue Accounts</div>
                <div className="text-base font-extrabold text-rose-700 mt-0.5">
                  {summary?.overdueInvoiceCount ?? 0} Invoices
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Active Promises</div>
                <div className="text-base font-extrabold text-amber-700 mt-0.5">
                  {summary?.activePromiseCount ?? 0} Commitments
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Open Exceptions</div>
                <div className="text-base font-extrabold text-purple-700 mt-0.5">
                  {summary?.openExceptionCount ?? 0} Mismatches
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 shadow-2xs">
            <span className="font-bold text-slate-900 block mb-0.5">Assistant Operational</span>
            Your assistant workspace is active and monitoring portfolio state.
          </div>
        </div>
      </div>
    </div>
  );
}
