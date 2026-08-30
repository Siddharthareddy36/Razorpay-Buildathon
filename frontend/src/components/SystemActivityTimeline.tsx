'use client';

import React from 'react';
import { Activity, Clock, ShieldCheck, FileCheck, Layers } from 'lucide-react';

interface ActivityItem {
  id: string;
  time: string;
  title: string;
  detail: string;
  type: 'audit' | 'priority' | 'promise' | 'exception';
}

interface SystemActivityTimelineProps {
  activities?: ActivityItem[];
}

export default function SystemActivityTimeline({ activities = [] }: SystemActivityTimelineProps) {
  const defaultActivities: ActivityItem[] = [
    {
      id: '1',
      time: '10:03 AM',
      title: 'Receivables Ledger Evaluated',
      detail: 'Days overdue recalculation executed for 70 accounts receivable records.',
      type: 'audit',
    },
    {
      id: '2',
      time: '10:04 AM',
      title: 'Priority Accounts Updated',
      detail: 'Identified 18 overdue accounts exceeding baseline payment terms.',
      type: 'priority',
    },
    {
      id: '3',
      time: '11:20 AM',
      title: 'Payment Commitment Recorded',
      detail: 'Active promise-to-pay status updated for Acme India Enterprises.',
      type: 'promise',
    },
    {
      id: '4',
      time: '04:10 PM',
      title: 'Reconciliation Exception Flagged',
      detail: 'Flagged ₹40,000 short pay discrepancy on INV-2024-036.',
      type: 'exception',
    },
  ];

  const items = activities.length > 0 ? activities : defaultActivities;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 uppercase">
            <Activity className="w-4 h-4 text-sky-700" />
            System Activity & Audit Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Financial operations event log</p>
        </div>
      </div>

      <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {items.map((act) => (
          <div key={act.id} className="relative group">
            <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-sky-600 border-2 border-white shadow-2xs" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-slate-900">{act.title}</span>
              <span className="text-[10px] text-slate-500 font-mono">{act.time}</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">{act.detail}</p>
          </div>
        ))}
      </div>

      <div className="pt-2.5 border-t border-slate-200 text-center">
        <span className="text-[11px] text-slate-500 font-medium">
          No automated decisions recorded yet.
        </span>
      </div>
    </div>
  );
}
