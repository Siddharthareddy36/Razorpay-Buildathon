'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Activity, AlertTriangle, Calendar, Building2, ChevronRight } from 'lucide-react';
import { fetchDatabaseHealth } from '../lib/api';
import { DatabaseHealthStatus } from '../types';

export default function Header() {
  const pathname = usePathname();
  const [health, setHealth] = useState<DatabaseHealthStatus | null>(null);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Receivables Overview';
    if (path.startsWith('/receivables')) return 'Receivables Management';
    if (path.startsWith('/commitments')) return 'Payment Commitments';
    if (path.startsWith('/reconciliation')) return 'Reconciliation Exceptions';
    if (path.startsWith('/customers')) return 'Corporate Accounts';
    if (path.startsWith('/activity')) return 'Activity & Audit';
    if (path.startsWith('/assistant')) return 'Receivables Assistant';
    if (path.startsWith('/invoices')) return 'Financial Case File';
    return 'Operations Console';
  };

  useEffect(() => {
    fetchDatabaseHealth()
      .then(setHealth)
      .catch(() => setHealth({ connected: false, tablesVerified: false, message: 'Backend disconnected' }));
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3 shadow-2xs">
      <div className="flex items-center justify-between gap-4">
        {/* Module Breadcrumb & Context */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 font-medium">
            <Building2 className="w-3.5 h-3.5 text-sky-700" />
            <span>Merchant Enterprise</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            {getPageTitle(pathname || '/')}
          </h2>
        </div>

        {/* System & Date Status Badges */}
        <div className="flex items-center space-x-3 text-xs font-medium">
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100/80 border border-slate-200 rounded-lg text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">{currentDate}</span>
          </div>

          {health === null ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-500 border border-slate-200 text-xs">
              <Activity className="w-3.5 h-3.5 animate-spin text-sky-600" />
              <span>Updating...</span>
            </div>
          ) : health.connected ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Data Updated</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>System Notice</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
