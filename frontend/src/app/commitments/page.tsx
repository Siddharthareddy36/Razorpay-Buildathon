'use client';

import React, { useEffect, useState } from 'react';
import { fetchDashboardPromises } from '../../lib/api';
import { formatCompactCurrency, formatExactCurrency } from '../../lib/formatters';
import { PromiseItem } from '../../types';
import { Clock, CheckCircle2, XCircle, RefreshCw, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function CommitmentsPage() {
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'BROKEN' | 'FULFILLED'>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardPromises();
      setPromises(data);
    } catch (err) {
      console.error('Failed to load promises:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCount = promises.filter((p) => p.status === 'ACTIVE' || p.status === 'pending').length;
  const brokenCount = promises.filter((p) => p.status === 'BROKEN' || p.status === 'broken').length;
  const fulfilledCount = promises.filter((p) => p.status === 'FULFILLED' || p.status === 'fulfilled').length;

  const filtered = promises.filter((p) => {
    if (activeFilter === 'ACTIVE') return p.status === 'ACTIVE' || p.status === 'pending';
    if (activeFilter === 'BROKEN') return p.status === 'BROKEN' || p.status === 'broken';
    if (activeFilter === 'FULFILLED') return p.status === 'FULFILLED' || p.status === 'fulfilled';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Payment Commitments</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track customer promises and identify commitments that need follow-up.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-sky-800 border border-slate-200 text-xs font-semibold rounded-lg transition-colors shrink-0 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Commitments
        </button>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-amber-500">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Active Commitments</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{activeCount}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Pending payment due date</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-rose-500">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Broken Promises</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{brokenCount}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Past promised date unfulfilled</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-emerald-500">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Fulfilled Promises</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{fulfilledCount}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Payment received on time</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-sky-500">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total Tracked</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{promises.length}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Customer commitments in ledger</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
        <span className="text-slate-500 font-semibold px-2">Filter Status:</span>
        {[
          { label: `All (${promises.length})`, key: 'ALL' },
          { label: `Active (${activeCount})`, key: 'ACTIVE' },
          { label: `Broken (${brokenCount})`, key: 'BROKEN' },
          { label: `Fulfilled (${fulfilledCount})`, key: 'FULFILLED' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key as any)}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              activeFilter === f.key
                ? 'bg-sky-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Commitments Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Promised Amount</th>
                <th className="px-4 py-3">Promised Date</th>
                <th className="px-4 py-3">Source Channel</th>
                <th className="px-4 py-3">Customer Commitment Note</th>
                <th className="px-4 py-3 text-right">Case File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-100 rounded w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 font-medium">
                    No commitments found for selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isBroken = item.status === 'BROKEN' || item.status === 'broken';
                  const isFulfilled = item.status === 'FULFILLED' || item.status === 'fulfilled';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isFulfilled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isBroken
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isFulfilled ? <CheckCircle2 className="w-3 h-3 mr-1" /> : isBroken ? <XCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">
                        {formatCompactCurrency(item.promised_amount)}
                        <span className="text-[10px] text-slate-500 block font-normal">{formatExactCurrency(item.promised_amount)}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {new Date(item.promised_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600 uppercase font-mono text-[11px]">
                        {item.source || 'EMAIL'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-sm">
                        {item.original_message || 'Payment commitment recorded during customer follow-up.'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/invoices/${item.invoice_id}`}
                          className="inline-flex items-center text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors"
                        >
                          Inspect Case
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
