'use client';

import React from 'react';
import { PhoneCall, Mail, AlertOctagon, ArrowRight } from 'lucide-react';

interface RecommendedActionProps {
  daysOverdue: number;
  hasBrokenPromise?: boolean;
  hasOpenException?: boolean;
  isAiAction?: boolean;
}

export default function RecommendedAction({
  daysOverdue,
  hasBrokenPromise = false,
  hasOpenException = false,
  isAiAction = false,
}: RecommendedActionProps) {
  let actionText = 'Send Reminder';
  let icon = Mail;
  let style = 'bg-slate-100 text-slate-700 border-slate-200';

  if (hasOpenException) {
    actionText = 'Review Mismatch';
    icon = AlertOctagon;
    style = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (hasBrokenPromise || daysOverdue > 30) {
    actionText = 'Urgent Call';
    icon = PhoneCall;
    style = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (daysOverdue > 14) {
    actionText = 'Email Escalation';
    icon = Mail;
    style = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  const IconComponent = icon;

  return (
    <div className="flex items-center space-x-1">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${style}`}>
        <IconComponent className="w-3 h-3 mr-1 shrink-0" />
        {actionText}
      </span>
      {isAiAction && <span className="text-[9px] font-mono text-sky-700">AI</span>}
    </div>
  );
}
