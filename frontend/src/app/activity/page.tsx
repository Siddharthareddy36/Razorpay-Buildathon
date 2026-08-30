'use client';

import React from 'react';
import SystemActivityTimeline from '../../components/SystemActivityTimeline';
import { Activity, ShieldCheck, Info } from 'lucide-react';

export default function ActivityPage() {
  return (
    <div className="space-y-5 text-slate-800">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Activity & Audit</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track important payment, commitment, and reconciliation events.</p>
        </div>
        <div className="flex items-center space-x-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Audit Trail Active</span>
        </div>
      </div>

      {/* Financial Activity Notice */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center space-x-3 text-xs text-slate-600 shadow-2xs">
        <Info className="w-4 h-4 text-sky-700 shrink-0" />
        <div>
          <span className="font-bold text-slate-900 block">Recent Financial Activity</span>
          <span>Log of system ledger updates, payment promises, and reconciliation checks.</span>
        </div>
      </div>

      {/* Main Activity Timeline Component */}
      <SystemActivityTimeline />
    </div>
  );
}
