'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchCustomerById } from '../../../lib/api';
import { ArrowLeft, UserCheck, DollarSign, FileText, CreditCard, Clock, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Customer360Page() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetchCustomerById(id)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to fetch customer profile'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <p className="text-xs font-semibold text-slate-400">Loading Customer 360 Profile...</p>
      </div>
    );
  }

  if (error || !data || !data.customer) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4 shadow-xl">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Customer Profile Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'Unable to locate customer account.'}</p>
        <Link
          href="/customers"
          className="inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Accounts Directory
        </Link>
      </div>
    );
  }

  const { customer, invoices, payments, promises, communications } = data;

  return (
    <div className="space-y-5 text-slate-800">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-3">
          <Link
            href="/customers"
            className="inline-flex items-center px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Accounts
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[11px] rounded border border-slate-200 uppercase">
                {customer.status || 'ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Customer 360 Account Profile & Historical Receivables Trace</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Outstanding</div>
          <div className="text-xl font-extrabold text-rose-700">
            {formatCurrency(customer.total_outstanding_amount)}
          </div>
        </div>
      </div>

      {/* Customer Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-xs font-bold text-sky-700 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
            <UserCheck className="w-4 h-4" /> Account Metadata
          </div>
          <div className="text-xs text-slate-700 space-y-1 pt-1 font-medium">
            <div>Email: {customer.email || 'N/A'}</div>
            <div>Phone: {customer.phone || 'N/A'}</div>
            <div>Terms: {customer.payment_terms || 'Net 30'}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
            <DollarSign className="w-4 h-4" /> Credit & Volume
          </div>
          <div className="text-xs text-slate-700 space-y-1 pt-1 font-medium">
            <div>Credit Limit: {formatCurrency(customer.credit_limit)}</div>
            <div>Total Invoiced: {formatCurrency(customer.total_invoiced_amount)}</div>
            <div>Total Paid: {formatCurrency(customer.total_paid_amount)}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
            <Clock className="w-4 h-4" /> Commitment Metrics
          </div>
          <div className="text-xs text-slate-700 space-y-1 pt-1 font-medium">
            <div>Promises Made: {customer.total_promises_made || promises.length}</div>
            <div>Broken Promises: <strong className="text-rose-700">{customer.total_broken_promises || 0}</strong></div>
          </div>
        </div>
      </div>

      {/* Relational Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Invoices */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <h2 className="text-xs font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2 uppercase tracking-wider">
            <FileText className="w-4 h-4 text-sky-700" /> Invoice History ({invoices.length})
          </h2>
          <div className="space-y-2 text-xs">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900">{inv.invoice_number}</div>
                  <div className="text-slate-500 text-[11px]">Due: {new Date(inv.due_date).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatCurrency(inv.amount)}</div>
                  <span className="text-[10px] uppercase font-semibold text-rose-700">{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payments */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <h2 className="text-xs font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2 uppercase tracking-wider">
            <CreditCard className="w-4 h-4 text-emerald-700" /> Payment History ({payments.length})
          </h2>
          <div className="space-y-2 text-xs">
            {payments.map((p: any) => (
              <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900">{formatCurrency(p.amount)}</div>
                  <div className="text-slate-500 text-[11px]">Date: {new Date(p.payment_date).toLocaleDateString()}</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 font-semibold">{p.payment_status || 'SUCCESS'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Promises */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <h2 className="text-xs font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-700" /> Promises ({promises.length})
          </h2>
          <div className="space-y-2 text-xs">
            {promises.map((pr: any) => (
              <div key={pr.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900">Promised: {formatCurrency(pr.promised_amount)}</div>
                  <div className="text-slate-500 text-[11px]">Due: {new Date(pr.promised_date).toLocaleDateString()}</div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 uppercase">{pr.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Communications */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <h2 className="text-xs font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2 uppercase tracking-wider">
            <MessageSquare className="w-4 h-4 text-indigo-700" /> Communications ({communications.length})
          </h2>
          <div className="space-y-2 text-xs">
            {communications.map((c: any) => (
              <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-800 capitalize">{c.direction} {c.channel}</span>
                  <span className="text-slate-500">{new Date(c.created_at || '').toLocaleDateString()}</span>
                </div>
                <p className="text-slate-700 text-[11px]">{c.message || c.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
