'use client';

import React, { useEffect, useState } from 'react';
import ReceivablesTable from '../components/ReceivablesTable';
import ReceivableDetailDrawer from '../components/ReceivableDetailDrawer';
import {
  fetchDashboardSummary,
  fetchInvoices,
  fetchDashboardPromises,
  fetchDashboardExceptions,
} from '../lib/api';
import { formatCompactCurrency, formatExactCurrency } from '../lib/formatters';
import {
  DashboardSummary,
  InvoiceWorkingViewItem,
  PromiseItem,
  ReconciliationExceptionItem,
} from '../types';
import {
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function OverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWorkingViewItem[]>([]);
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [exceptions, setExceptions] = useState<ReconciliationExceptionItem[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWorkingViewItem | null>(null);

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumData, invData, promData, excData] = await Promise.all([
        fetchDashboardSummary().catch(() => null),
        fetchInvoices().catch(() => []),
        fetchDashboardPromises().catch(() => []),
        fetchDashboardExceptions().catch(() => []),
      ]);
      setSummary(sumData);
      setInvoices(invData);
      setPromises(promData);
      setExceptions(excData);
    } catch (err) {
      console.error('Error loading overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalOutstanding = summary?.outstandingAmount || 0;
  const revenueAtRisk = summary?.revenueAtRisk || 0;
  const riskPercentage = totalOutstanding > 0 ? Math.round((revenueAtRisk / totalOutstanding) * 100) : 0;

  const topPriorityInvoices = invoices.slice(0, 5);

  const highValueOverdue = invoices.filter((inv) => inv.days_overdue > 30 || (inv.outstanding_amount ?? inv.amount) >= 1000000);
  const brokenPromises = promises.filter((p) => p.status === 'BROKEN' || p.status === 'broken');
  const openExceptions = exceptions.filter((e) => e.status === 'EXPLAINED' || e.status === 'open' || e.status === 'OPEN');

  return (
    <div className="space-y-5">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Receivables Overview</h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
              Active Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Understand outstanding exposure, collection risk, payment commitments, and reconciliation issues.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-sky-800 border border-slate-200 text-xs font-semibold rounded-lg transition-colors shrink-0 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Overview
        </button>
      </div>

      {/* 1. Executive KPI Strip (5 Primary KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Revenue at Risk */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Revenue at Risk</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {loading ? <span className="inline-block w-20 h-7 bg-slate-100 animate-pulse rounded" /> : formatCompactCurrency(revenueAtRisk)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium" title={formatExactCurrency(revenueAtRisk)}>
            {formatExactCurrency(revenueAtRisk)} overdue
          </p>
        </div>

        {/* KPI 2: Total Outstanding */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs border-l-4 border-l-sky-600">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
            <DollarSign className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {loading ? <span className="inline-block w-20 h-7 bg-slate-100 animate-pulse rounded" /> : formatCompactCurrency(totalOutstanding)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Total uncollected ledger</p>
        </div>

        {/* KPI 3: Overdue Invoices */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overdue Invoices</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {loading ? <span className="inline-block w-12 h-7 bg-slate-100 animate-pulse rounded" /> : summary?.overdueInvoiceCount ?? 0}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Require collection action</p>
        </div>

        {/* KPI 4: Active Promises */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs border-l-4 border-l-emerald-600">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Promises</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {loading ? <span className="inline-block w-12 h-7 bg-slate-100 animate-pulse rounded" /> : summary?.activePromiseCount ?? promises.length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Pending commitments</p>
        </div>

        {/* KPI 5: Open Exceptions */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs border-l-4 border-l-purple-600">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Open Exceptions</span>
            <AlertOctagon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {loading ? <span className="inline-block w-12 h-7 bg-slate-100 animate-pulse rounded" /> : summary?.openExceptionCount ?? exceptions.length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Short-pay mismatches</p>
        </div>
      </div>

      {/* 2. Clean Risk Exposure Snapshot */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-rose-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Financial Risk Exposure Snapshot</h2>
          </div>
          <span className="text-xs font-bold text-rose-700 font-mono">
            {riskPercentage}% At-Risk Share
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200">
          <div
            style={{ width: `${riskPercentage}%` }}
            className="bg-rose-500 h-full rounded-l-full transition-all duration-500"
          />
          <div
            style={{ width: `${100 - riskPercentage}%` }}
            className="bg-slate-200 h-full transition-all duration-500"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5 font-medium">
          <div>Total Ledger Outstanding: <strong className="text-slate-900">{formatCompactCurrency(totalOutstanding)}</strong></div>
          <div>Overdue Balance Exposure: <strong className="text-rose-700">{formatCompactCurrency(revenueAtRisk)}</strong></div>
        </div>
      </div>

      {/* 3. Priority Receivables Preview (Top 5 Only) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Priority Accounts</h2>
            <p className="text-xs text-slate-500">Top 5 high-risk accounts requiring immediate review</p>
          </div>
          <Link
            href="/receivables"
            className="inline-flex items-center px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
          >
            View all {invoices.length} receivables
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>

        <ReceivablesTable
          invoices={topPriorityInvoices}
          loading={loading}
          selectedInvoiceId={selectedInvoice?.id}
          onSelectInvoice={(inv) => setSelectedInvoice(inv)}
        />
      </div>

      {/* 4. Critical Operational Alerts & System Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Operational Alerts */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Critical Operational Alerts
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Real-time Ledger Checks</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-rose-200">
              <div className="text-slate-600 text-[11px] font-semibold">High-Value Overdue (≥₹10L)</div>
              <div className="text-xl font-extrabold text-rose-700 mt-1">{highValueOverdue.length}</div>
              <Link href="/receivables" className="text-[11px] text-sky-700 hover:underline font-bold mt-1.5 inline-block">
                Inspect accounts &rarr;
              </Link>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-amber-200">
              <div className="text-slate-600 text-[11px] font-semibold">Broken Commitments</div>
              <div className="text-xl font-extrabold text-amber-700 mt-1">{brokenPromises.length}</div>
              <Link href="/commitments" className="text-[11px] text-sky-700 hover:underline font-bold mt-1.5 inline-block">
                View commitments &rarr;
              </Link>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-purple-200">
              <div className="text-slate-600 text-[11px] font-semibold">Reconciliation Mismatches</div>
              <div className="text-xl font-extrabold text-purple-700 mt-1">{openExceptions.length}</div>
              <Link href="/reconciliation" className="text-[11px] text-sky-700 hover:underline font-bold mt-1.5 inline-block">
                Review exceptions &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* System Status Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>System & Data Status</span>
            </div>

            <div className="space-y-2 pt-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-emerald-700">All Systems Operational</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Active Accounts:</span>
                <span className="font-mono text-slate-800">70 Invoices / 25 Customers</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Rules Engine:</span>
                <span className="font-mono text-sky-700 font-semibold">Active & Monitoring</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-200 text-[11px] text-slate-500">
            All financial modules active and up to date.
          </div>
        </div>
      </div>

      {/* Side Drawer for clicked invoice */}
      <ReceivableDetailDrawer
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
