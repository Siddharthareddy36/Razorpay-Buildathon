'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Cpu, Database, RefreshCw, ChevronRight } from 'lucide-react';
import { runPromiseAgent } from '../lib/api';

interface PromiseIntelligenceData {
  success: boolean;
  promiseId: string;
  invoiceId: string;
  customerId: string;
  invoiceNumber: string;
  customerName: string;
  promisedAmount: number;
  promisedDate: string;
  fulfilledAmount: number;
  fulfillmentRatio: number;
  daysUntilPromise: number;
  daysPastPromise: number;
  deterministicPromiseState: string;
  commitmentReliability: string;
  promiseAssessment: string;
  reason: string;
  evidence: string[];
  recommendedAction: string;
  confidence: number;
  policyDecision: string;
  policyReason: string;
  rulesTriggered: string[];
  safeAction: string;
}

interface PromiseIntelligenceCardProps {
  lookupId: string; // promiseId or invoiceId or invoiceNumber
  onRunComplete?: (data: PromiseIntelligenceData) => void;
}

export default function PromiseIntelligenceCard({ lookupId, onRunComplete }: PromiseIntelligenceCardProps) {
  const [data, setData] = useState<PromiseIntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<'SERVICE_UNAVAILABLE' | 'DATABASE_CONTEXT_UNAVAILABLE' | 'EXECUTION_FAILED' | 'TIMEOUT' | 'NOT_FOUND' | null>(null);

  const fetchIntelligence = async () => {
    if (!lookupId) return;
    setLoading(true);
    setError(null);
    setErrorState(null);
    try {
      const result = await runPromiseAgent({ promiseId: lookupId, invoiceId: lookupId });
      if (result && result.success) {
        setData(result);
        if (onRunComplete) onRunComplete(result);
      } else {
        const errType = result?.error;
        if (errType === 'P2P_CONTEXT_UNAVAILABLE') {
          setErrorState('DATABASE_CONTEXT_UNAVAILABLE');
          setError('Promise-to-Pay Intelligence is temporarily unavailable while payment context is being loaded. Please retry.');
        } else if (errType === 'P2P_AGENT_UNAVAILABLE') {
          setErrorState('SERVICE_UNAVAILABLE');
          setError('Promise-to-Pay Agent service is currently unavailable.');
        } else {
          setErrorState('EXECUTION_FAILED');
          setError(result?.detail || result?.error || 'Promise-to-Pay Agent failed during execution.');
        }
      }
    } catch (err: any) {
      if (err?.status === 503 || err?.error === 'P2P_AGENT_UNAVAILABLE') {
        setErrorState('SERVICE_UNAVAILABLE');
        setError('Promise-to-Pay Agent service is currently unavailable.');
      } else if (err?.error === 'P2P_CONTEXT_UNAVAILABLE' || err?.stage === 'LOAD_CONTEXT') {
        setErrorState('DATABASE_CONTEXT_UNAVAILABLE');
        setError('Promise-to-Pay Intelligence is temporarily unavailable while payment context is being loaded. Please retry.');
      } else if (err?.status === 504 || err?.error === 'TIMEOUT') {
        setErrorState('TIMEOUT');
        setError('Promise-to-Pay Agent execution timed out. Please retry.');
      } else if (err?.status === 404) {
        setErrorState('NOT_FOUND');
        setError('No promise record found for this invoice lookup.');
      } else {
        setErrorState('EXECUTION_FAILED');
        setError(err?.message || err?.detail || 'Promise-to-Pay Agent failed during context loading.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, [lookupId]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const getReliabilityBadge = (rel: string) => {
    const r = (rel || '').toUpperCase();
    if (r === 'HIGH') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> HIGH RELIABILITY
        </span>
      );
    }
    if (r === 'CRITICAL' || r === 'LOW') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> {r} RELIABILITY
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
        <Clock className="w-3 h-3" /> MEDIUM RELIABILITY
      </span>
    );
  };

  const getAssessmentBadge = (ass: string) => {
    const a = (ass || '').toUpperCase();
    if (a === 'FULFILLED' || a === 'RELIABLE') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
          {a}
        </span>
      );
    }
    if (a === 'BROKEN' || a === 'AT_RISK') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300">
          {a}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
        {a}
      </span>
    );
  };

  const getPolicyBadge = (pol: string) => {
    const p = (pol || '').toUpperCase();
    if (p === 'APPROVED') {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> POLICY APPROVED
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
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-mono">
          <Cpu className="w-4 h-4 text-sky-400" /> PROMISE-TO-PAY INTELLIGENCE SPECIALIST
        </div>

        {errorState === 'SERVICE_UNAVAILABLE' && (
          <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2">
            <div className="text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> SERVICE UNAVAILABLE
            </div>
            <p className="text-slate-300 text-xs">{error}</p>
          </div>
        )}

        {errorState === 'DATABASE_CONTEXT_UNAVAILABLE' && (
          <div className="p-4 bg-slate-950 border border-sky-500/30 rounded-xl space-y-2">
            <div className="text-sky-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <Database className="w-4 h-4" /> DATABASE CONTEXT LOADING
            </div>
            <p className="text-slate-300 text-xs">{error}</p>
          </div>
        )}

        {errorState === 'TIMEOUT' && (
          <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2">
            <div className="text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <Clock className="w-4 h-4" /> EXECUTION TIMED OUT
            </div>
            <p className="text-slate-300 text-xs">{error}</p>
          </div>
        )}

        {errorState === 'NOT_FOUND' && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4" /> NO ACTIVE PROMISE RECORD
            </div>
            <p className="text-slate-400 text-xs">No active payment promise found for this invoice lookup.</p>
          </div>
        )}

        {errorState === 'EXECUTION_FAILED' && (
          <div className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl space-y-2">
            <div className="text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4" /> SPECIALIST EXECUTION FAILED
            </div>
            <p className="text-rose-300 text-xs">{error}</p>
          </div>
        )}

        {!errorState && (
          <p className="text-slate-400 text-xs">{error || 'No active promise intelligence available.'}</p>
        )}

        <button
          onClick={fetchIntelligence}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Run Promise Intelligence Analysis
        </button>
      </div>
    );
  }

  const fulfillmentPercent = Math.min(100, Math.round(data.fulfillmentRatio * 100));

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Promise-to-Pay Intelligence Agent
              <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded">
                LangGraph + Gemini 3.6
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Fulfillment analysis & customer commitment reliability engine</p>
          </div>
        </div>
        <button
          onClick={fetchIntelligence}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          title="Re-run P2P Agent"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Section 1: Financial Promise Fact (Database Truth) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/60 pb-2">
            <span className="flex items-center gap-1.5 text-sky-400 font-mono">
              <Database className="w-3.5 h-3.5" /> FINANCIAL PROMISE FACT (DATABASE TRUTH)
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              DB STATE: {data.deterministicPromiseState}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Promised Amount</div>
              <div className="text-sm font-bold text-white mt-0.5">{formatCurrency(data.promisedAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Promised Date</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">{data.promisedDate}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Received Allocation</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{formatCurrency(data.fulfilledAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Remaining Balance</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                {formatCurrency(Math.max(0, data.promisedAmount - data.fulfilledAmount))}
              </div>
            </div>
          </div>

          {/* Fulfillment Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium text-slate-400">
              <span>Fulfillment Progress</span>
              <span className="text-sky-400 font-bold">{fulfillmentPercent}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  fulfillmentPercent >= 100
                    ? 'bg-emerald-500'
                    : fulfillmentPercent > 0
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${fulfillmentPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Section 2: Customer Commitment Reliability */}
        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Customer Commitment Reliability
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              Customer: <span className="font-semibold text-white">{data.customerName}</span>
            </div>
          </div>
          <div>{getReliabilityBadge(data.commitmentReliability)}</div>
        </div>

        {/* Section 3: AI Assessment & Evidence (Gemini 3.6 Flash) */}
        <div className="space-y-3 bg-slate-950/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 font-mono">
              <Cpu className="w-3.5 h-3.5" /> AI AGENT REASONING (GEMINI 3.6)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Confidence: {(data.confidence * 100).toFixed(0)}%</span>
              {getAssessmentBadge(data.promiseAssessment)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-200 leading-relaxed font-medium">
              <span className="text-slate-400 font-normal">Why: </span>
              {data.reason}
            </div>

            {/* Evidence List */}
            {data.evidence && data.evidence.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Supporting Factual Evidence:
                </div>
                <ul className="space-y-1">
                  {data.evidence.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommended Operational Action */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 bg-sky-950/30 p-3 rounded-lg border border-sky-900/40">
            <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
              Recommended Collection Action:
            </div>
            <div className="text-xs font-semibold text-white mt-1">{data.recommendedAction}</div>
          </div>
        </div>

        {/* Section 4: Deterministic Policy Engine Guardrail */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Deterministic Safety Policy Engine
            </div>
            <div className="text-xs text-slate-300">{data.policyReason}</div>
          </div>
          <div>{getPolicyBadge(data.policyDecision)}</div>
        </div>
      </div>
    </div>
  );
}
