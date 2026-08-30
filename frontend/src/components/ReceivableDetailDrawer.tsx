'use client';

import React from 'react';
import Link from 'next/link';
import { InvoiceWorkingViewItem } from '../types';
import PriorityBadge from './receivables/PriorityBadge';
import { formatCompactCurrency, formatExactCurrency } from '../lib/formatters';
import { X, ExternalLink, ShieldAlert, DollarSign, Calendar, UserCheck } from 'lucide-react';

interface ReceivableDetailDrawerProps {
  invoice: InvoiceWorkingViewItem | null;
  onClose: () => void;
}

export default function ReceivableDetailDrawer({ invoice, onClose }: ReceivableDetailDrawerProps) {
  if (!invoice) return null;

  const outstanding = invoice.outstanding_amount ?? invoice.amount - (invoice.paid_amount || 0);
  const isHighRisk = invoice.days_overdue > 30 || outstanding >= 500000;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Overlay Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col justify-between overflow-y-auto z-10 p-5 space-y-5 text-slate-800">
        <div>
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 font-mono">{invoice.invoice_number}</h2>
                <PriorityBadge priority={invoice.priority} daysOverdue={invoice.days_overdue} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{invoice.customer_name || 'Customer Account'}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Balance Header */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center mb-4">
            <div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Outstanding Balance</div>
              <div className="text-xl font-extrabold text-rose-700">{formatCompactCurrency(outstanding)}</div>
              <div className="text-[10px] text-slate-500 font-medium">{formatExactCurrency(outstanding)}</div>
            </div>
            <div className="text-right text-xs">
              <div className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Aging Status</div>
              <div className={`font-bold ${invoice.days_overdue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {invoice.days_overdue} Days Overdue
              </div>
            </div>
          </div>

          {/* WHY IT MATTERS Section */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Why This Needs Attention
              </h3>
            </div>

            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${invoice.days_overdue > 30 ? 'bg-rose-600' : 'bg-amber-500'}`} />
                <div>
                  <span className="font-bold text-slate-900">{invoice.days_overdue} Days Overdue</span>
                  <span className="text-slate-500 block text-[11px]">Due date was {new Date(invoice.due_date).toLocaleDateString()}</span>
                </div>
              </li>

              <li className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-600 mt-1 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900">High Outstanding Exposure</span>
                  <span className="text-slate-500 block text-[11px]">Original invoice total: {formatCompactCurrency(invoice.amount)}</span>
                </div>
              </li>

              {invoice.customer_risk_score !== undefined && invoice.customer_risk_score !== null && (
                <li className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900">Customer Risk Score: {invoice.customer_risk_score}/100</span>
                    <span className="text-slate-500 block text-[11px]">Historical payment delay probability</span>
                  </div>
                </li>
              )}
            </ul>
          </div>

          {/* CUSTOMER SNAPSHOT */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-1.5 mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-700" /> Customer Snapshot
            </h3>
            <div className="text-xs space-y-1 pt-1">
              <div className="font-bold text-slate-900 text-sm">{invoice.customer_name || 'Customer Profile'}</div>
              {invoice.customer_email && <div className="text-slate-600">Email: {invoice.customer_email}</div>}
              {invoice.customer_phone && <div className="text-slate-600">Phone: {invoice.customer_phone}</div>}
            </div>
          </div>

          {/* NEXT STEP */}
          <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 text-xs">
            <span className="text-[10px] text-sky-800 font-bold uppercase block tracking-wider">Recommended Next Step</span>
            <span className="text-slate-900 font-semibold block mt-0.5">
              {isHighRisk ? 'Account Manager Review & Phone Call Escalation' : 'Standard Automated Email Follow-up'}
            </span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-3.5 border-t border-slate-200 bg-white sticky bottom-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200"
          >
            Close
          </button>
          <Link
            href={`/invoices/${invoice.id}`}
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
          >
            Open Full Case
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
