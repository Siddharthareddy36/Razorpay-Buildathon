'use client';

import React from 'react';
import { InvoiceWorkingViewItem } from '../types';
import { ShieldAlert, AlertCircle, Info, Calendar, User, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface WhyNeedsAttentionPanelProps {
  invoice: InvoiceWorkingViewItem | null;
  onClose?: () => void;
}

export default function WhyNeedsAttentionPanel({ invoice, onClose }: WhyNeedsAttentionPanelProps) {
  if (!invoice) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-center text-slate-500 shadow-2xs">
        <Info className="w-7 h-7 mx-auto mb-2 text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">Select an invoice from Priority Accounts</p>
        <p className="text-xs text-slate-500 mt-0.5">Inspect overdue factors, customer history, and recommended action</p>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const isHighRisk = invoice.days_overdue > 30 || (invoice.outstanding_amount ?? invoice.amount) >= 500000;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 text-slate-800">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-sky-700">{invoice.invoice_number}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700 uppercase">
              {invoice.status}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">{invoice.customer_name || 'Customer'}</h3>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">Outstanding</div>
          <div className="text-base font-extrabold text-rose-700">
            {formatCurrency(invoice.outstanding_amount ?? invoice.amount - (invoice.paid_amount || 0))}
          </div>
        </div>
      </div>

      {/* Why it needs attention */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Why This Needs Attention
          </h4>
        </div>

        <ul className="space-y-2 text-xs">
          <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${invoice.days_overdue > 30 ? 'bg-rose-600' : 'bg-amber-500'}`} />
            <div>
              <span className="font-bold text-slate-900">{invoice.days_overdue} days overdue</span>
              <span className="text-slate-500 block text-[11px]">Due date was {new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
          </li>

          <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-rose-600 mt-1 shrink-0" />
            <div>
              <span className="font-bold text-slate-900">Significant balance: {formatCurrency(invoice.outstanding_amount ?? invoice.amount)}</span>
              <span className="text-slate-500 block text-[11px]">Original total invoice amount was {formatCurrency(invoice.amount)}</span>
            </div>
          </li>
        </ul>
      </div>

      {/* Suggested Operational Action */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
          <span className="font-medium">Recommended Next Step:</span>
          <span className="font-semibold text-slate-900">
            {isHighRisk ? 'Direct Phone Call & Escalation' : 'Standard Email Reminder'}
          </span>
        </div>
        <Link
          href={`/invoices/${invoice.id}`}
          className="w-full inline-flex items-center justify-center px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
        >
          Inspect Full Financial Case File
          <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
        </Link>
      </div>
    </div>
  );
}
