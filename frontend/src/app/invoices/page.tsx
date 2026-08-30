'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvoiceDetailPage from './[id]/page';
import { Loader2 } from 'lucide-react';

function InvoicesRootContent() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id') || searchParams.get('number') || searchParams.get('invoiceId');

  if (targetId) {
    return <InvoiceDetailPage params={{ id: targetId }} />;
  }

  return (
    <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 p-8 rounded-xl text-center space-y-4 shadow-2xs">
      <h2 className="text-base font-bold text-slate-900">Financial Case File</h2>
      <p className="text-xs text-slate-500">Please select an invoice from the Receivables Queue or Assistant to inspect.</p>
      <a
        href="/receivables"
        className="inline-flex items-center px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
      >
        Go to Receivables Queue
      </a>
    </div>
  );
}

export default function InvoicesRootPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-sky-700" />
        <p className="text-xs font-semibold text-slate-500">Loading Case File Workspace...</p>
      </div>
    }>
      <InvoicesRootContent />
    </Suspense>
  );
}
