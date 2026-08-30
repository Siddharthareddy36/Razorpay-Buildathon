'use client';

import React from 'react';
import { DollarSign, AlertCircle, Clock, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { DashboardSummary } from '../types';

interface DashboardMetricsProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

export default function DashboardMetrics({ summary, loading }: DashboardMetricsProps) {
  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const cards = [
    {
      title: 'Revenue at Risk',
      value: formatCurrency(summary?.revenueAtRisk),
      subtitle: 'Outstanding overdue balance requiring action',
      icon: AlertCircle,
      accent: 'border-l-4 border-l-rose-500 text-rose-400',
    },
    {
      title: 'Total Outstanding',
      value: formatCurrency(summary?.outstandingAmount),
      subtitle: 'Total uncollected accounts receivable',
      icon: DollarSign,
      accent: 'border-l-4 border-l-sky-500 text-sky-400',
    },
    {
      title: 'Overdue Invoices',
      value: summary?.overdueInvoiceCount ?? 0,
      subtitle: 'Require immediate collection attention',
      icon: Clock,
      accent: 'border-l-4 border-l-amber-500 text-amber-400',
    },
    {
      title: 'Active Promises',
      value: summary?.activePromiseCount ?? 0,
      subtitle: 'Pending customer payment commitments',
      icon: CheckCircle2,
      accent: 'border-l-4 border-l-emerald-500 text-emerald-400',
    },
    {
      title: 'Open Exceptions',
      value: summary?.openExceptionCount ?? 0,
      subtitle: 'Reconciliation short-pay mismatches',
      icon: AlertTriangle,
      accent: 'border-l-4 border-l-purple-500 text-purple-400',
    },
    {
      title: 'Customers Monitored',
      value: summary?.customerCount ?? 0,
      subtitle: 'Active corporate account profiles',
      icon: Users,
      accent: 'border-l-4 border-l-blue-500 text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`bg-slate-900/90 border border-slate-800/90 rounded-xl p-5 shadow-lg ${card.accent} transition-transform hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
                <div className="text-2xl font-extrabold text-white tracking-tight mt-1">
                  {loading ? <span className="inline-block w-24 h-7 bg-slate-800 animate-pulse rounded"></span> : card.value}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">{card.subtitle}</p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-400">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
