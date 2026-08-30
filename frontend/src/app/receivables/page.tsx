'use client';

import React, { useEffect, useState } from 'react';
import ReceivablesTable from '../../components/ReceivablesTable';
import ReceivableDetailDrawer from '../../components/ReceivableDetailDrawer';
import { fetchInvoices, fetchDashboardPromises } from '../../lib/api';
import { formatCompactCurrency } from '../../lib/formatters';
import { InvoiceWorkingViewItem, PromiseItem } from '../../types';
import { RefreshCw, Filter, ArrowUpDown, Search, DollarSign, AlertCircle, ShieldAlert, Clock } from 'lucide-react';

export default function ReceivablesPage() {
  const [invoices, setInvoices] = useState<InvoiceWorkingViewItem[]>([]);
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWorkingViewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWorkingViewItem | null>(null);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OVERDUE' | 'HIGH_VALUE' | 'PARTIAL' | 'PAID'>('ALL');
  const [sortBy, setSortBy] = useState<'OVERDUE' | 'OUTSTANDING' | 'PRIORITY'>('OVERDUE');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [invData, promData] = await Promise.all([
        fetchInvoices().catch(() => []),
        fetchDashboardPromises().catch(() => []),
      ]);
      setInvoices(invData);
      setPromises(promData);
    } catch (err) {
      console.error('Failed to load receivables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = [...invoices];

    if (activeFilter === 'OVERDUE') {
      result = result.filter((inv) => inv.days_overdue > 0 || inv.status === 'overdue' || inv.status === 'OVERDUE');
    } else if (activeFilter === 'HIGH_VALUE') {
      result = result.filter((inv) => (inv.outstanding_amount ?? inv.amount) >= 500000);
    } else if (activeFilter === 'PARTIAL') {
      result = result.filter((inv) => inv.status === 'partially_paid' || inv.status === 'PARTIAL');
    } else if (activeFilter === 'PAID') {
      result = result.filter((inv) => inv.status === 'paid' || inv.status === 'PAID');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          (inv.customer_name && inv.customer_name.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'OVERDUE') {
      result.sort((a, b) => b.days_overdue - a.days_overdue);
    } else if (sortBy === 'OUTSTANDING') {
      result.sort(
        (a, b) =>
          (b.outstanding_amount ?? b.amount - (b.paid_amount || 0)) -
          (a.outstanding_amount ?? a.amount - (a.paid_amount || 0))
      );
    } else if (sortBy === 'PRIORITY') {
      const priorityMap: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      result.sort((a, b) => (priorityMap[b.priority || 'LOW'] || 1) - (priorityMap[a.priority || 'LOW'] || 1));
    }

    setFilteredInvoices(result);
  }, [invoices, activeFilter, sortBy, searchQuery]);

  // Aggregate Calculations
  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.outstanding_amount ?? inv.amount - (inv.paid_amount || 0)), 0);
  const overdueExposure = invoices.filter((i) => i.days_overdue > 0).reduce((acc, inv) => acc + (inv.outstanding_amount ?? inv.amount - (inv.paid_amount || 0)), 0);
  const highValueCount = invoices.filter((i) => (i.outstanding_amount ?? i.amount) >= 500000).length;
  const brokenPromiseCount = promises.filter((p) => p.status === 'BROKEN' || p.status === 'broken').length;

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Receivables Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Find the accounts that deserve attention first.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-sky-800 border border-slate-200 text-xs font-semibold rounded-lg transition-colors shrink-0 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Second Compact Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Outstanding</div>
            <div className="text-lg font-extrabold text-slate-900">{formatCompactCurrency(totalOutstanding)}</div>
          </div>
          <DollarSign className="w-5 h-5 text-sky-600" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Overdue Exposure</div>
            <div className="text-lg font-extrabold text-rose-700">{formatCompactCurrency(overdueExposure)}</div>
          </div>
          <AlertCircle className="w-5 h-5 text-rose-600" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">High Value Accounts (≥₹5L)</div>
            <div className="text-lg font-extrabold text-slate-900">{highValueCount}</div>
          </div>
          <ShieldAlert className="w-5 h-5 text-amber-600" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Broken Commitments</div>
            <div className="text-lg font-extrabold text-amber-700">{brokenPromiseCount}</div>
          </div>
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
      </div>

      {/* Control Bar: Search, Filters & Sorting */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice number or customer..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
          {[
            { label: 'All Invoices', key: 'ALL' },
            { label: 'Overdue Only', key: 'OVERDUE' },
            { label: 'High Value (≥₹5L)', key: 'HIGH_VALUE' },
            { label: 'Partially Paid', key: 'PARTIAL' },
            { label: 'Paid', key: 'PAID' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key as any)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors shrink-0 ${
                activeFilter === f.key
                  ? 'bg-sky-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sorting Selection */}
        <div className="flex items-center space-x-2 text-xs text-slate-600 shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-md px-2 py-1 focus:outline-none focus:border-sky-600 text-xs"
          >
            <option value="OVERDUE">Days Overdue</option>
            <option value="OUTSTANDING">Outstanding Amount</option>
            <option value="PRIORITY">Priority Score</option>
          </select>
        </div>
      </div>

      {/* Receivables Working Table */}
      <ReceivablesTable
        invoices={filteredInvoices}
        loading={loading}
        selectedInvoiceId={selectedInvoice?.id}
        onSelectInvoice={(inv) => setSelectedInvoice(inv)}
      />

      {/* Right-Side Detail Drawer */}
      <ReceivableDetailDrawer
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
