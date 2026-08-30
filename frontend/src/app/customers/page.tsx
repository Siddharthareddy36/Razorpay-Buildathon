'use client';

import React, { useEffect, useState } from 'react';
import { fetchCustomers } from '../../lib/api';
import { formatCompactCurrency, formatExactCurrency } from '../../lib/formatters';
import { Users, RefreshCw, ArrowUpRight, ShieldAlert, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setError(err.message || 'Unable to load customer accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalMonitored = customers.length;
  const withOverdue = customers.filter((c) => (c.total_overdue_invoices || 0) > 0 || (c.total_overdue_amount || 0) > 0 || (c.total_outstanding_amount || 0) > 0).length;
  const withBrokenPromises = customers.filter((c) => (c.total_broken_promises || 0) > 0).length;
  const highExposure = customers.filter((c) => (c.total_outstanding_amount || 0) >= 1000000 || (c.credit_limit || 0) >= 1000000).length;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Customer Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Understand customer exposure and payment behaviour.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-sky-800 border border-slate-200 text-xs font-semibold rounded-lg transition-colors shrink-0 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Accounts
        </button>
      </div>

      {/* Analytical Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-sky-600">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Customers Monitored</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalMonitored}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Corporate account profiles</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-amber-500">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Accounts with Overdue</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{withOverdue}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Carrying overdue balance</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-rose-500">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Accounts with Broken Commitments</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{withBrokenPromises}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Historical broken commitments</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-purple-600">
          <div className="text-[10px] font-bold text-slate-500 uppercase">High Exposure (≥₹10L)</div>
          <div className="text-2xl font-extrabold text-purple-700 mt-1">{highExposure}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">High balance accounts</div>
        </div>
      </div>

      {/* Customers Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 bg-white flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-700" />
            Monitored Customer Directory ({customers.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Credit Limit</th>
                <th className="px-4 py-3">Total Outstanding</th>
                <th className="px-4 py-3">Broken Commitments</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Account 360</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-12"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-100 rounded w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-600 font-medium">
                    <span className="text-rose-700 font-bold block mb-1">Unable to load customer accounts.</span>
                    <button
                      onClick={loadData}
                      className="inline-flex items-center px-3 py-1 bg-slate-100 hover:bg-slate-200 text-sky-800 border border-slate-200 text-xs font-bold rounded-lg transition-colors"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500 font-medium">
                    No customer accounts recorded.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                      {c.legal_name && <div className="text-[10px] text-slate-500">{c.legal_name}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{c.email || 'No email registered'}</div>
                      <div className="text-slate-500 text-[11px]">{c.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 text-xs">
                      {formatCompactCurrency(c.credit_limit)}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-rose-700 text-xs">
                      {formatCompactCurrency(c.total_outstanding_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-xs ${c.total_broken_promises > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>
                        {c.total_broken_promises || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded border border-slate-200 uppercase">
                        {c.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="inline-flex items-center text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors"
                      >
                        Inspect 360
                        <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
