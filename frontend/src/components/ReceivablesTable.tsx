'use client';

import React from 'react';
import Link from 'next/link';
import { InvoiceWorkingViewItem } from '../types';
import PriorityBadge from './receivables/PriorityBadge';
import PriorityReason from './receivables/PriorityReason';
import RecommendedAction from './receivables/RecommendedAction';
import { formatCompactCurrency, formatExactCurrency } from '../lib/formatters';
import { ArrowUpRight, Layers } from 'lucide-react';

interface ReceivablesTableProps {
  invoices: InvoiceWorkingViewItem[];
  loading: boolean;
  selectedInvoiceId?: string | null;
  onSelectInvoice?: (invoice: InvoiceWorkingViewItem) => void;
}

export default function ReceivablesTable({
  invoices,
  loading,
  selectedInvoiceId,
  onSelectInvoice,
}: ReceivablesTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/80">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xs font-bold text-slate-900 tracking-tight uppercase">Accounts Requiring Attention</h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-50 border border-sky-200 text-sky-700 rounded">
              Priority Ranking
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Accounts prioritized by overdue exposure and risk signals</p>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
          <Layers className="w-3.5 h-3.5 text-sky-600" />
          <span>Click row to open detail drawer</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-800">
          <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-4 py-2.5">Invoice & Customer</th>
              <th className="px-4 py-2.5 text-right">Outstanding Balance</th>
              <th className="px-4 py-2.5">Age</th>
              <th className="px-4 py-2.5">Risk Signals</th>
              <th className="px-4 py-2.5">Next Action</th>
              <th className="px-4 py-2.5 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-14"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-36"></div></td>
                  <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-12"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                  <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-100 rounded w-8 ml-auto"></div></td>
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                  No receivable records found in ledger.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const isSelected = selectedInvoiceId === inv.id;
                const outstanding = inv.outstanding_amount ?? inv.amount - (inv.paid_amount || 0);
                const hasOpenException = (inv.open_exceptions_count || 0) > 0;

                return (
                  <tr
                    key={inv.id}
                    onClick={() => onSelectInvoice && onSelectInvoice(inv)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-50/90 border-l-4 border-l-sky-600'
                        : 'hover:bg-slate-50/90'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <PriorityBadge priority={inv.priority} daysOverdue={inv.days_overdue} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 text-xs">{inv.customer_name || 'Customer'}</div>
                      <div className="font-mono text-[11px] text-sky-700 font-semibold mt-0.5">{inv.invoice_number}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-extrabold text-rose-700 text-xs">
                        {formatCompactCurrency(outstanding)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">{formatExactCurrency(outstanding)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-xs ${inv.days_overdue > 30 ? 'text-rose-700' : inv.days_overdue > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                        {inv.days_overdue}d overdue
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityReason
                        daysOverdue={inv.days_overdue}
                        outstandingAmount={outstanding}
                        hasOpenException={hasOpenException}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <RecommendedAction
                        daysOverdue={inv.days_overdue}
                        hasOpenException={hasOpenException}
                      />
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="inline-flex items-center text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
