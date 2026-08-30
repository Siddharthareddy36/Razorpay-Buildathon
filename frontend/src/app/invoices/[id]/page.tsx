'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InvoiceDetail from '../../../components/InvoiceDetail';
import {
  fetchInvoiceById,
  fetchInvoicePayments,
  fetchInvoicePromises,
  fetchInvoiceCommunications,
  fetchInvoiceExceptions,
} from '../../../lib/api';
import {
  InvoiceWorkingViewItem,
  PaymentItem,
  PromiseItem,
  CommunicationItem,
  ReconciliationExceptionItem,
} from '../../../types';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function InvoiceDetailPage(props: PageProps) {
  const routeParams = useParams();
  const rawId = routeParams?.id || props?.params?.id;
  const id = rawId ? decodeURIComponent(String(rawId)) : '';

  const [invoice, setInvoice] = useState<InvoiceWorkingViewItem | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [communications, setCommunications] = useState<CommunicationItem[]>([]);
  const [exceptions, setExceptions] = useState<ReconciliationExceptionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    Promise.all([
      fetchInvoiceById(id),
      fetchInvoicePayments(id).catch(() => []),
      fetchInvoicePromises(id).catch(() => []),
      fetchInvoiceCommunications(id).catch(() => []),
      fetchInvoiceExceptions(id).catch(() => []),
    ])
      .then(([invData, payData, promData, commData, excData]) => {
        if (!invData) {
          setError(`Invoice record '${id}' was not found in the live Supabase database.`);
        } else {
          setInvoice(invData);
          setPayments(payData);
          setPromises(promData);
          setCommunications(commData);
          setExceptions(excData);
        }
      })
      .catch((err: any) => {
        console.error('Error fetching invoice detail:', err);
        setError(err.message || 'Failed to fetch invoice details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-sky-700" />
        <p className="text-xs font-semibold text-slate-500">Loading Financial Case File...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 p-8 rounded-xl text-center space-y-4 shadow-2xs">
        <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">FINANCIAL CASE COULD NOT BE LOADED</h2>
        <p className="text-xs text-slate-500">{error || `Invoice ${id} was not found.`}</p>
        <Link
          href="/receivables"
          className="inline-flex items-center px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Receivables Queue
        </Link>
      </div>
    );
  }

  return (
    <InvoiceDetail
      invoice={invoice}
      payments={payments}
      promises={promises}
      communications={communications}
      exceptions={exceptions}
    />
  );
}
