'use client';

import React, { useState, useEffect } from 'react';

import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Cpu, Database, ChevronRight, Layers, HelpCircle, AlertOctagon } from 'lucide-react';
import Link from 'next/link';
import { runSupervisorAgent } from '../lib/api';

interface SpecialistInsight {
  agent: 'RECEIVABLES' | 'P2P' | 'RECONCILIATION';
  status: string;
  headline: string;
  details: Record<string, any>;
}


interface SupervisorIntelligenceData {
  success: boolean;
  query?: string;
  intent?: string;
  selectedAgents?: string[];
  executiveSummary?: string;
  hasConflict?: boolean;
  crossAgentConflict?: boolean;
  conflictSummary?: string;
  agentInsights?: SpecialistInsight[];
  crossAgentFindings?: string[];
  recommendedAction?: string;
  confidence?: number;
  policyDecision?: string;
  policyReason?: string;
  rulesTriggered?: string[];
  safeAction?: string;
  agentRunId?: string;
  auditId?: string;
  financialFacts?: {
    invoiceNumber?: string;
    customerName?: string;
    invoiceAmount?: number;
    outstandingAmount?: number;
    daysOverdue?: number;
  };
}



interface SupervisorIntelligenceCardProps {
  query?: string;
  invoiceNumber?: string;
  data?: SupervisorIntelligenceData | null;
  onClose?: () => void;
}

export default function SupervisorIntelligenceCard({ query, invoiceNumber, data: initialData, onClose }: SupervisorIntelligenceCardProps) {
  const [data, setData] = useState<SupervisorIntelligenceData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<'SERVICE_UNAVAILABLE' | 'EXECUTION_FAILED' | 'TIMEOUT' | 'NOT_FOUND' | null>(null);

  const fetchSupervisorData = async () => {
    if (initialData) return;
    const userQuery = query || (invoiceNumber ? `Why is ${invoiceNumber} still outstanding?` : 'Provide overall portfolio status');
    setLoading(true);
    setError(null);
    setErrorState(null);
    try {
      const result = await runSupervisorAgent({ query: userQuery, invoiceNumber });
      if (result && result.success) {
        setData(result);
      } else {
        const errType = result?.error;
        if (errType === 'SUPERVISOR_UNAVAILABLE') {
          setErrorState('SERVICE_UNAVAILABLE');
          setError('Multi-Agent Supervisor microservice is currently unavailable.');
        } else {
          setErrorState('EXECUTION_FAILED');
          setError(result?.detail || result?.error || 'Multi-Agent Supervisor failed during investigation.');
        }
      }
    } catch (err: any) {
      if (err?.status === 503 || err?.error === 'SUPERVISOR_UNAVAILABLE') {
        setErrorState('SERVICE_UNAVAILABLE');
        setError('Multi-Agent Supervisor microservice is currently unavailable.');
      } else if (err?.status === 504 || err?.error === 'TIMEOUT') {
        setErrorState('TIMEOUT');
        setError('Multi-Agent Supervisor execution timed out. Please retry.');
      } else if (err?.status === 404) {
        setErrorState('NOT_FOUND');
        setError('No investigation context found for this query.');
      } else {
        setErrorState('EXECUTION_FAILED');
        setError(err?.message || err?.detail || 'Multi-Agent Supervisor failed during execution.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchSupervisorData();
    }
  }, [query, invoiceNumber]);

  const formatCurrency = (val?: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const getAgentBadge = (agent: string) => {
    const a = agent.toUpperCase();
    if (a === 'RECEIVABLES') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">RECEIVABLES</span>;
    }
    if (a === 'P2P' || a === 'PROMISE') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">P2P</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">RECONCILIATION</span>;
  };

  const getPolicyBadge = (pol: string) => {
    const p = (pol || '').toUpperCase();
    if (p === 'APPROVED') {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> APPROVED
        </span>
      );
    }
    if (p === 'REJECTED') {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5" /> REJECTED
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5" /> HUMAN REVIEW REQUIRED
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-pulse space-y-4">
        <div className="h-6 bg-slate-800 rounded w-1/3"></div>
        <div className="h-20 bg-slate-800/50 rounded-xl"></div>
        <div className="h-28 bg-slate-800/40 rounded-xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-purple-400 text-xs font-mono">
          <Layers className="w-4 h-4" /> MULTI-AGENT SUPERVISOR ORCHESTRATOR
        </div>

        {errorState === 'SERVICE_UNAVAILABLE' && (
          <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2">
            <div className="text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> SUPERVISOR SERVICE UNAVAILABLE
            </div>
            <p className="text-slate-300 text-xs">{error}</p>
          </div>
        )}

        {errorState === 'TIMEOUT' && (
          <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2">
            <div className="text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <RefreshCw className="w-4 h-4" /> EXECUTION TIMED OUT
            </div>
            <p className="text-slate-300 text-xs">{error}</p>
          </div>
        )}

        {errorState === 'NOT_FOUND' && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> NO CONTEXT FOUND
            </div>
            <p className="text-slate-400 text-xs">No investigation targets matched the query.</p>
          </div>
        )}

        {errorState === 'EXECUTION_FAILED' && (
          <div className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl space-y-2">
            <div className="text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4" /> SUPERVISOR WORKFLOW FAILED
            </div>
            <p className="text-rose-300 text-xs">{error}</p>
          </div>
        )}

        {!errorState && (
          <p className="text-slate-400 text-xs">{error || 'No active supervisor investigation data available.'}</p>
        )}

        <button
          onClick={fetchSupervisorData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Run Supervisor Cross-Domain Investigation
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
      {/* Header */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Multi-Agent Supervisor
              <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                INTENT: {data.intent}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Selective Specialist Orchestration & Executive Synthesis</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data.selectedAgents && data.selectedAgents.map((ag, i) => (
            <React.Fragment key={i}>{getAgentBadge(ag)}</React.Fragment>
          ))}
          <button
            onClick={fetchSupervisorData}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 ml-2"
            title="Re-run Supervisor Workflow"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Conflict Warning Banner */}
        {data.hasConflict && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-3 text-xs text-rose-200">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-rose-300">CROSS-AGENT CONFLICT DETECTED</div>
              <div className="mt-0.5">{data.conflictSummary}</div>
            </div>
          </div>
        )}

        {/* Section 1: Executive Summary */}
        <div className="space-y-2 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider font-mono flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> EXECUTIVE INVESTIGATION SUMMARY
          </div>
          <div className="text-xs text-slate-200 font-medium leading-relaxed">
            {data.executiveSummary}
          </div>
        </div>

        {/* Section 2: Financial Facts & Context */}
        {data.financialFacts && data.financialFacts.invoiceNumber && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider font-mono flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> AUTHORITATIVE FINANCIAL FACTS
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Invoice</div>
                <div className="font-bold text-white mt-0.5">{data.financialFacts.invoiceNumber}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Customer</div>
                <div className="font-bold text-slate-200 mt-0.5 truncate">{data.financialFacts.customerName}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Outstanding</div>
                <div className="font-bold text-rose-400 mt-0.5">{formatCurrency(data.financialFacts.outstandingAmount)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Days Overdue</div>
                <div className="font-bold text-amber-400 mt-0.5">{data.financialFacts.daysOverdue} Days</div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Specialist Cross-Domain Insights */}
        {data.crossAgentFindings && data.crossAgentFindings.length > 0 && (
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
            <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider font-mono">
              SPECIALIST AGENT FINDINGS:
            </div>
            <ul className="space-y-1.5 pt-1">
              {data.crossAgentFindings.map((finding, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-300">
                  <ChevronRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section 4: Recommended Operator Action & Policy */}
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1 max-w-lg">
            <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">
              Recommended Next Step:
            </div>
            <div className="text-white font-semibold">{data.recommendedAction}</div>
            <div className="text-[11px] text-slate-400 pt-0.5">{data.policyReason}</div>
          </div>

          <div className="shrink-0">{getPolicyBadge(data.policyDecision || '')}</div>

        </div>

        {/* Action Links */}
        <div className="flex gap-3 pt-2">
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-colors border border-slate-700"
            >
              Close Investigation View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
