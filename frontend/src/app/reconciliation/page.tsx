'use client';

import React, { useEffect, useState } from 'react';
import { fetchDashboardExceptions } from '../../lib/api';
import { formatCompactCurrency, formatExactCurrency } from '../../lib/formatters';
import { ReconciliationExceptionItem } from '../../types';
import { AlertOctagon, RefreshCw, ArrowUpRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ReconciliationPage() {
  const [exceptions, setExceptions] = useState<ReconciliationExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardExceptions();
      setExceptions(data);
    } catch (err) {
      console.error('Failed to load reconciliation exceptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCount = exceptions.filter((e) => e.status === 'EXPLAINED' || e.status === 'open' || e.status === 'OPEN').length;
  const resolvedCount = exceptions.filter((e) => e.status === 'RESOLVED' || e.status === 'resolved').length;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Payment Reconciliation</h1>
          <p className="text-xs text-slate-500 mt-0.5">Investigate differences between expected and received amounts.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-sky-800 border border-slate-200 text-xs font-semibold rounded-lg transition-colors shrink-0 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Exceptions
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-purple-600">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Open Mismatches</div>
          <div className="text-2xl font-extrabold text-purple-700 mt-1">{openCount}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Payment discrepancy unclosed</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-amber-500">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Review Required</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{openCount}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Awaiting finance sign-off</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-emerald-500">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Resolved</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{resolvedCount}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Reconciled in ledger</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-sky-500">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total Exceptions</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{exceptions.length}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Short-pay audit logs</div>
        </div>
      </div>

      {/* Distinction Banner */}
      <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-purple-900 block">Audit Integrity Standard</span>
            <span className="text-slate-600 text-[11px]">
              Expected / Received / Difference are <strong className="text-purple-900 font-semibold">VERIFIED FINANCIALS</strong>. Reasons & Hypotheses are <strong className="text-purple-800 font-semibold">POSSIBLE EXPLANATION</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Exceptions Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Review State</th>
                <th className="px-4 py-3 text-slate-900">Expected (Verified)</th>
                <th className="px-4 py-3 text-emerald-800">Received (Verified)</th>
                <th className="px-4 py-3 text-rose-800">Difference (Verified)</th>
                <th className="px-4 py-3 text-purple-900">Possible Explanation</th>
                <th className="px-4 py-3 text-right">Case File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-100 rounded w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 font-medium">
                    No reconciliation exceptions currently recorded.
                  </td>
                </tr>
              ) : (
                exceptions.map((item) => {
                  const discrepancy = item.difference ?? item.discrepancy_amount ?? (item.expected_amount - item.received_amount);
                  const hypothesis = item.reason || item.exception_type || 'Possible TDS Deduction';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold rounded uppercase">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {formatCompactCurrency(item.expected_amount)}
                        <span className="text-[10px] text-slate-500 block font-normal">{formatExactCurrency(item.expected_amount)}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        {formatCompactCurrency(item.received_amount)}
                        <span className="text-[10px] text-slate-500 block font-normal">{formatExactCurrency(item.received_amount)}</span>
                      </td>
                      <td className="px-4 py-3 font-extrabold text-rose-700">
                        {formatCompactCurrency(discrepancy)}
                        <span className="text-[10px] text-slate-500 block font-normal">{formatExactCurrency(discrepancy)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="font-semibold text-slate-900 block text-xs">{hypothesis}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/invoices/${item.invoice_id}`}
                          className="inline-flex items-center text-xs font-bold text-purple-700 hover:text-purple-800 transition-colors"
                        >
                          Review Case
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
    </div>
  );
}
