'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { runReceivablesAgent, runSupervisorAgent, runPromiseAgent, runReconciliationAgent } from '../lib/api';
import {
  InvoiceWorkingViewItem,
  PaymentItem,
  PromiseItem,
  CommunicationItem,
  ReconciliationExceptionItem,
} from '../types';
import PromiseIntelligenceCard from './PromiseIntelligenceCard';
import ReconciliationIntelligenceCard from './ReconciliationIntelligenceCard';
import SupervisorIntelligenceCard from './SupervisorIntelligenceCard';
import PriorityBadge from './receivables/PriorityBadge';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  CreditCard,
  MessageSquare,
  AlertOctagon,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Activity,
  ShieldAlert,
  Sparkles,
  Bot,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Zap,
  Play,
  TrendingUp,
  Scale
} from 'lucide-react';

interface InvoiceDetailProps {
  invoice: InvoiceWorkingViewItem;
  payments: PaymentItem[];
  promises: PromiseItem[];
  communications: CommunicationItem[];
  exceptions: ReconciliationExceptionItem[];
}

export default function InvoiceDetail({
  invoice,
  payments,
  promises,
  communications,
  exceptions,
}: InvoiceDetailProps) {
  const [recAgentResult, setRecAgentResult] = useState<any | null>(null);
  const [recAgentLoading, setRecAgentLoading] = useState(false);
  const [recAgentError, setRecAgentError] = useState<string | null>(null);

  const [supAgentResult, setSupAgentResult] = useState<any | null>(null);
  const [supAgentLoading, setSupAgentLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'CASE_FILE' | 'P2P' | 'RECONCILIATION' | 'SUPERVISOR'>('CASE_FILE');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const outstanding = invoice.outstanding_amount ?? (invoice.amount - (invoice.paid_amount || 0));
  const totalPaid = invoice.paid_amount || payments.reduce((acc, p) => acc + (p.allocated_amount || p.amount || 0), 0);
  const recoveredAmount = Math.max(0, totalPaid);
  const recoveryRate = invoice.amount > 0 ? Math.min(100, Math.round((recoveredAmount / invoice.amount) * 100)) : 0;

  const handleRunReceivablesAgent = async () => {
    setRecAgentLoading(true);
    setRecAgentError(null);
    try {
      const res = await runReceivablesAgent(invoice.id);
      setRecAgentResult(res);
    } catch (err: any) {
      setRecAgentError(err.message || 'Failed to execute Receivables Agent analysis.');
    } finally {
      setRecAgentLoading(false);
    }
  };

  const handleRunSupervisor = async () => {
    setSupAgentLoading(true);
    try {
      const res = await runSupervisorAgent({ query: `Analyze case for invoice ${invoice.invoice_number}`, invoiceNumber: invoice.invoice_number });
      setSupAgentResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSupAgentLoading(false);
    }
  };

  const brokenPromisesCount = promises.filter((p) => p.status === 'BROKEN' || p.status === 'broken').length;
  const activePromisesCount = promises.filter((p) => p.status === 'ACTIVE' || p.status === 'active' || p.status === 'PENDING' || p.status === 'pending').length;
  const commitmentReliability = brokenPromisesCount >= 2 ? 'CRITICAL' : brokenPromisesCount === 1 ? 'LOW' : 'MEDIUM';

  return (
    <div className="space-y-6 text-slate-800 pb-12">
      {/* 1. CASE HEADER & BREADCRUMB (Part 3) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
            <Link href="/receivables" className="hover:text-sky-700 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Receivables Queue
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Financial Case File</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {invoice.invoice_number}
            </h1>
            <PriorityBadge priority={invoice.priority} daysOverdue={invoice.days_overdue} />
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-md border border-slate-200 uppercase">
              {invoice.status}
            </span>
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> HUMAN REVIEW REQUIRED
            </span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono font-bold text-[10px] rounded">
              LIVE DATABASE
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>Customer: <strong className="text-slate-900">{invoice.customer_name || 'Customer Account'}</strong></span>
            {invoice.customer_id && (
              <Link href={`/customers/${invoice.customer_id}`} className="text-sky-700 hover:underline flex items-center gap-0.5 font-bold text-[11px]">
                (Open Customer Profile <ExternalLink className="w-3 h-3" />)
              </Link>
            )}
          </div>
        </div>

        <div className="md:text-right bg-rose-50/60 p-4 rounded-xl border border-rose-200/80 shrink-0">
          <div className="text-[11px] text-rose-800 font-bold uppercase tracking-wider">Outstanding Balance</div>
          <div className="text-2xl font-black text-rose-700">{formatCurrency(outstanding)}</div>
          <div className="text-xs text-slate-600 font-medium mt-0.5">
            Due Date: <strong>{new Date(invoice.due_date).toLocaleDateString()}</strong> • <strong className="text-rose-700">{invoice.days_overdue} Days Overdue</strong>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs font-bold">
        {[
          { key: 'CASE_FILE', label: 'Full Investigation Workspace', icon: Activity },
          { key: 'P2P', label: 'Promise-to-Pay Specialist', icon: Clock },
          { key: 'RECONCILIATION', label: 'Reconciliation Specialist', icon: AlertOctagon },
          { key: 'SUPERVISOR', label: 'Multi-Agent Supervisor', icon: Bot },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-sky-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-t border-x border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: P2P */}
      {activeTab === 'P2P' && (
        <div className="space-y-4">
          <PromiseIntelligenceCard lookupId={invoice.id} />
        </div>
      )}

      {/* TAB CONTENT: RECONCILIATION */}
      {activeTab === 'RECONCILIATION' && (
        <div className="space-y-4">
          {exceptions.length > 0 ? (
            <ReconciliationIntelligenceCard exceptionId={exceptions[0].id} />
          ) : (
            <div className="bg-white border border-slate-200 p-8 rounded-xl text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">No Open Reconciliation Exceptions</h3>
              <p className="text-xs text-slate-500">Payment ledger matches invoice expectations cleanly.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SUPERVISOR */}
      {activeTab === 'SUPERVISOR' && (
        <div className="space-y-4">
          <SupervisorIntelligenceCard query={`Analyze invoice ${invoice.invoice_number}`} invoiceNumber={invoice.invoice_number} />
        </div>
      )}

      {/* TAB CONTENT: MAIN WORKSPACE */}
      {activeTab === 'CASE_FILE' && (
        <div className="space-y-6">
          {/* 3. FINANCIAL SUMMARY STRIP (Part 4) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-sky-700" /> Financial Summary & Ledger Facts</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded">DETERMINISTIC ANALYSIS</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs divide-x divide-slate-100">
              <div className="pr-2">
                <span className="text-slate-500 font-medium block text-[11px]">Invoice Amount</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="px-2">
                <span className="text-slate-500 font-medium block text-[11px]">Amount Paid</span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5 block">{formatCurrency(invoice.paid_amount || 0)}</span>
              </div>
              <div className="px-2">
                <span className="text-slate-500 font-medium block text-[11px]">Outstanding Balance</span>
                <span className="font-extrabold text-rose-700 text-sm mt-0.5 block">{formatCurrency(outstanding)}</span>
              </div>
              <div className="px-2">
                <span className="text-slate-500 font-medium block text-[11px]">Due Date</span>
                <span className="font-semibold text-slate-900 text-xs mt-1 block">{new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
              <div className="pl-2">
                <span className="text-slate-500 font-medium block text-[11px]">Days Overdue</span>
                <span className={`font-bold text-xs mt-1 block ${invoice.days_overdue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {invoice.days_overdue} Days
                </span>
              </div>
            </div>
          </div>

          {/* 4. RECEIVABLES INTELLIGENCE AGENT (Part 5) */}
          <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-5 border border-sky-800/50 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-800/40 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-sky-500/20 text-sky-300 rounded-lg border border-sky-400/30">
                  <Bot className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold tracking-wide text-white uppercase">
                      Receivables Intelligence Agent
                    </h2>
                    <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold rounded border border-sky-400/30">
                      RECEIVABLES INTELLIGENCE
                    </span>
                  </div>
                  <p className="text-xs text-sky-200/70 mt-0.5">
                    Ground-Truth Financial Facts + Risk Priority Assessment
                  </p>
                </div>
              </div>

              <button
                onClick={handleRunReceivablesAgent}
                disabled={recAgentLoading}
                className="inline-flex items-center justify-center px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                {recAgentLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin text-sky-200" />
                    Executing Graph...
                  </>
                ) : recAgentResult ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 text-sky-200" />
                    Re-analyze Account
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-300" />
                    Run Receivables Intelligence
                  </>
                )}
              </button>
            </div>

            {recAgentError && (
              <div className="p-3 bg-rose-950/80 border border-rose-700/60 rounded-lg text-rose-200 text-xs">
                <strong>Execution Error:</strong> {recAgentError}
              </div>
            )}

            {recAgentResult ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Database Fact</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">
                      Outstanding: {formatCurrency(recAgentResult.outstandingAmount)} • {recAgentResult.daysOverdue}d Overdue
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Baseline Score</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">
                      Priority: <strong className="text-amber-300">{recAgentResult.baselinePriority}</strong> (Score: {recAgentResult.baselineScore})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Policy Decision</span>
                    <span className="text-slate-200 font-semibold mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Status: <strong className="text-emerald-300">{recAgentResult.policyDecision}</strong>
                    </span>
                  </div>
                </div>

                <div className="bg-sky-950/40 p-3.5 rounded-lg border border-sky-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">AI Priority Assessment:</span>
                      <PriorityBadge priority={recAgentResult.priority} />
                    </div>
                    <span className="text-[11px] font-medium text-sky-300/80">
                      Confidence Score: <strong>{Math.round((recAgentResult.confidence || 0.9) * 100)}%</strong>
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium text-xs leading-relaxed">
                    {recAgentResult.priorityReason}
                  </p>
                </div>

                {recAgentResult.evidence && recAgentResult.evidence.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider block">
                      WHY THIS CASE MATTERS (EVIDENCE):
                    </span>
                    <ul className="space-y-1 list-disc list-inside text-slate-300 text-[11px]">
                      {recAgentResult.evidence.map((ev: string, idx: number) => (
                        <li key={idx} className="leading-snug">{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-amber-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-400">
                    Recommended Collection Next Step
                  </span>
                  <p className="font-semibold text-xs mt-1 text-white">
                    {recAgentResult.recommendedAction}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-sky-200/70 py-1">
                Click <strong>"Run Receivables Intelligence"</strong> to evaluate 7-node LangGraph prioritization rules on this invoice.
              </div>
            )}
          </div>

          {/* 5. CUSTOMER CONTEXT & PROMISE HISTORY (Parts 6 & 7) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Profile Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-sky-700" /> Customer Profile & History
                </h2>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded">LIVE DATABASE</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm">{invoice.customer_name || 'Customer Account'}</div>
                {invoice.customer_email && <div className="text-slate-600">Email: {invoice.customer_email}</div>}
                {invoice.customer_phone && <div className="text-slate-600">Phone: {invoice.customer_phone}</div>}
                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>Recorded Promises: <strong>{promises.length}</strong></div>
                  <div>Broken Commitments: <strong className="text-rose-700">{brokenPromisesCount}</strong></div>
                  <div>Active Commitments: <strong className="text-amber-700">{activePromisesCount}</strong></div>
                  <div>Historical Reliability: <strong className={commitmentReliability === 'CRITICAL' ? 'text-rose-700 font-bold' : 'text-amber-700'}>{commitmentReliability}</strong></div>
                </div>
              </div>
            </div>

            {/* Promise-to-Pay Summary Block */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" /> Current Promise vs Reliability
                </h2>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded">
                  P2P INTELLIGENCE
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-600 font-medium">Current Promise Status:</span>
                  <span className="font-bold text-slate-900 uppercase">
                    {promises.length > 0 ? promises[0].status : 'NO_ACTIVE_PROMISE'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-600 font-medium">Customer Commitment Reliability:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${commitmentReliability === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {commitmentReliability} RELIABILITY
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 italic pt-1">
                  Note: Current promise state (e.g. ACTIVE) is visually distinguished from customer reliability pattern (e.g. LOW).
                </p>
              </div>
            </div>
          </div>

          {/* 6. MULTI-AGENT CASE ASSESSMENT & SUPERVISOR SYNTHESIS (Parts 10 & 11) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-700" /> Multi-Agent Specialist Assessment & Conflict Check
              </h2>
              <button
                onClick={handleRunSupervisor}
                disabled={supAgentLoading}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" /> Run Multi-Agent Supervisor
              </button>
            </div>

            {/* Specialist Panel Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-1">
                  <span>RECEIVABLES</span>
                  <span className="text-rose-700 font-extrabold">{invoice.priority || 'CRITICAL'}</span>
                </div>
                <p className="text-[11px] text-slate-600">Overdue balance of {formatCurrency(outstanding)} ({invoice.days_overdue}d past due).</p>
                <div className="text-[10px] text-emerald-700 font-bold">Policy: APPROVED</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-1">
                  <span>PROMISE-TO-PAY</span>
                  <span className="text-amber-700 font-extrabold">{commitmentReliability}</span>
                </div>
                <p className="text-[11px] text-slate-600">{brokenPromisesCount} broken promise(s) recorded historically.</p>
                <div className="text-[10px] text-amber-700 font-bold">Policy: HUMAN_REVIEW</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-1">
                  <span>RECONCILIATION</span>
                  <span className="text-purple-700 font-extrabold">{exceptions.length > 0 ? exceptions[0].status : 'CLEAN'}</span>
                </div>
                <p className="text-[11px] text-slate-600">{exceptions.length > 0 ? `Open exception: ${exceptions[0].exception_type || 'Discrepancy'}` : 'No open ledger exceptions.'}</p>
                <div className="text-[10px] text-purple-700 font-bold">{exceptions.length > 0 ? 'Policy: HUMAN_REVIEW' : 'Policy: APPROVED'}</div>
              </div>
            </div>

            {/* Cross-Agent Conflict Display (Part 11) */}
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1 text-amber-900">
              <div className="flex items-center space-x-2 font-bold text-amber-800">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                <span>CROSS-AGENT POLICY GATE: HUMAN REVIEW REQUIRED</span>
              </div>
              <p className="text-[11px] text-amber-950 font-medium">
                Receivables Agent recommends high-priority collection, while P2P Agent notes low historical commitment reliability and open reconciliation checks. Manual operator verification is required before initiating external interventions.
              </p>
            </div>
          </div>

          {/* 7. POLICY GUARDRAIL & NEXT BEST ACTION (Parts 12 & 13) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Policy Guardrail Block */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" /> Policy Guardrail Decision
                </h2>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded">POLICY ENGINE</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Policy Status:</span>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[11px]">
                    HUMAN REVIEW REQUIRED
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Rules Triggered: <strong className="text-slate-900">RULE_3_ACTIVE_DISPUTE_OR_EXCEPTIONS, RULE_8_BROKEN_PROMISE_WITH_HISTORY</strong>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                  Safe Action: <strong>Verify customer commitment evidence and issue controlled reminder notice.</strong>
                </div>
              </div>
            </div>

            {/* Next Best Action Block */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-sky-700" /> Next Best Action (Action Planner)
                </h2>
                <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold rounded">
                  ACTION PLANNER
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 uppercase">SEND_PAYMENT_REMINDER</span>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[10px]">
                    PRIORITY: HIGH
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Automated payment reminder for broken promise on invoice {invoice.invoice_number}.
                </p>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-500 font-medium">Approval Required: <strong>Yes (Human Sign-off)</strong></span>
                  <span className="text-slate-400 font-mono text-[10px]">IdempotencyKey: REM-{invoice.invoice_number}-20260830</span>
                </div>
              </div>
            </div>
          </div>

          {/* 8. RECOVERY OUTCOME & INDEPENDENT LEDGER TRACKING (Part 14) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-700" /> Recovery Outcome & Financial Verification
              </h2>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded">SUPABASE LEDGER</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-[10px] font-bold uppercase block">Outstanding Before</span>
                <span className="font-extrabold text-slate-900 text-xs mt-0.5 block">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-[10px] font-bold uppercase block">Current Outstanding</span>
                <span className="font-extrabold text-rose-700 text-xs mt-0.5 block">{formatCurrency(outstanding)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-[10px] font-bold uppercase block">Recovered Amount</span>
                <span className="font-extrabold text-emerald-700 text-xs mt-0.5 block">{formatCurrency(recoveredAmount)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-[10px] font-bold uppercase block">Recovery Rate</span>
                <span className="font-extrabold text-slate-900 text-xs mt-0.5 block">{recoveryRate}%</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-[10px] font-bold uppercase block">Outcome Status</span>
                <span className={`font-bold text-[10px] mt-0.5 block uppercase ${recoveredAmount > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {recoveredAmount >= invoice.amount ? 'FULL_RECOVERY' : recoveredAmount > 0 ? 'PARTIAL_RECOVERY' : 'NO_RECOVERY_OBSERVED'}
                </span>
              </div>
            </div>
          </div>

          {/* 9. RELATIONAL TABLES & AUDIT TRAIL (Part 8, 9, 15) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payments Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Payments ({payments.length})
              </h2>
              {payments.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No payment transactions recorded.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {payments.map((p, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900">{formatCurrency(p.allocated_amount || p.amount)}</div>
                        <div className="text-[11px] text-slate-500">Method: {p.payment_method || 'Bank Transfer'} • Ref: {p.reference_number || 'N/A'}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold uppercase">
                        {p.payment_status || p.status || 'completed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Communications Panel (Part 9 Evidence) */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" /> Communication Evidence ({communications.length})
              </h2>
              {communications.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No communication logs recorded.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {communications.map((c, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-800 uppercase">{c.direction || 'OUTBOUND'} • {c.channel || 'EMAIL'}</span>
                        <span className="text-slate-400">{c.created_at || c.timestamp ? new Date(c.created_at || c.timestamp || '').toLocaleString() : ''}</span>
                      </div>
                      <p className="text-slate-700 text-[11px]">{c.message || c.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
