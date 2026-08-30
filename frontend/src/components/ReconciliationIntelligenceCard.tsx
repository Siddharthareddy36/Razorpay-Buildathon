'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Cpu, Database, ChevronRight, AlertOctagon, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { runReconciliationAgent } from '../lib/api';


interface ReconciliationIntelligenceData {
  success: boolean;
  exceptionId: string;
  invoiceId: string;
  paymentId: string;
  customerId: string;
  invoiceNumber: string;
  customerName: string;
  expectedAmount: number;
  receivedAmount: number;
  difference: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  primaryHypothesis: string;
  reason: string;
  evidence: string[];
  alternativeHypotheses: string[];
  recommendedAction: string;
  confidence: number;
  policyDecision: string;
  policyReason: string;
  rulesTriggered: string[];
  safeAction: string;
  hasConflict: boolean;
  conflictReason?: string;
  conflictDetails: string[];
  evidenceQualityScore: number;
  level1Evidence: string[];
  level2Evidence: string[];
  level3Evidence: string[];
  level4Evidence: string[];
  humanReviewReason?: string;
  humanReviewDetails?: {
    whyRequired: string;
    evidenceConflict?: string;
    missingEvidence?: string;
    whatHumanShouldVerify: string;
  };
}

interface ReconciliationIntelligenceCardProps {
  exceptionId: string;
  onClose?: () => void;
}

export default function ReconciliationIntelligenceCard({ exceptionId, onClose }: ReconciliationIntelligenceCardProps) {
  const [data, setData] = useState<ReconciliationIntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<'SERVICE_UNAVAILABLE' | 'EXECUTION_FAILED' | 'TIMEOUT' | null>(null);

  const fetchIntelligence = async () => {
    if (!exceptionId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await runReconciliationAgent({ exceptionId });
      if (result && result.success) {
        setData(result);
      } else {
        setError(result?.error || result?.detail || 'Reconciliation Intelligence Agent is temporarily unavailable.');
      }
    } catch (err: any) {
      setError(err?.message || 'Reconciliation Agent is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, [exceptionId]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const getHypothesisBadge = (hyp: string) => {
    const h = (hyp || '').toUpperCase();
    if (h === 'TDS' || h === 'MDR' || h === 'GST') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300">
          {h} DEDUCTION
        </span>
      );
    }
    if (h === 'PARTIAL_PAYMENT') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
          PARTIAL PAYMENT
        </span>
      );
    }
    if (h === 'DUPLICATE_PAYMENT' || h === 'REFUND') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300">
          {h}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-md text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">
        {h}
      </span>
    );
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
        <div className="flex items-center justify-center gap-2 text-sky-400 text-xs font-mono">
          <Cpu className="w-4 h-4" /> RECONCILIATION INTELLIGENCE SPECIALIST
        </div>

        {errorState === 'SERVICE_UNAVAILABLE' && (
          <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2">
            <div className="text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> RECONCILIATION SERVICE UNAVAILABLE
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

        {errorState === 'EXECUTION_FAILED' && (
          <div className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl space-y-2">
            <div className="text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4" /> SPECIALIST EXECUTION FAILED
            </div>
            <p className="text-rose-300 text-xs">{error}</p>
          </div>
        )}

        {!errorState && (
          <p className="text-slate-400 text-xs">{error || 'No active reconciliation exception intelligence available.'}</p>
        )}

        <button
          onClick={fetchIntelligence}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Run Reconciliation Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
      {/* Header */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Reconciliation Intelligence Agent
              <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                Evidence Score: {((data.evidenceQualityScore || 0.5) * 100).toFixed(0)}/100
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">4-Level Evidence Hierarchy & Data Conflict Reasoning Engine</p>
          </div>
        </div>
        <button
          onClick={fetchIntelligence}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          title="Re-run Reconciliation Agent"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Conflict Warning Banner */}
        {data.hasConflict && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-3 text-xs text-rose-200">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-rose-300">DATA CONFLICT DETECTED</div>
              <div className="mt-0.5">{data.conflictReason}</div>
            </div>
          </div>
        )}

        {/* Section 1: Financial Reconciliation Facts (DATABASE FACT) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/60 pb-1.5">
            <span className="flex items-center gap-1.5 text-sky-400 font-mono text-[11px]">
              <Database className="w-3.5 h-3.5" /> DATABASE FACT — FINANCIAL RECONCILIATION VALUES
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              INVOICE: {data.invoiceNumber || 'INV'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Expected Total</div>
              <div className="text-sm font-bold text-white mt-0.5">{formatCurrency(data.expectedAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Received Gross</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{formatCurrency(data.receivedAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Discrepancy</div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">{formatCurrency(Math.abs(data.difference))}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Allocated</div>
              <div className="text-sm font-bold text-sky-400 mt-0.5">{formatCurrency(data.allocatedAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Unallocated</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">{formatCurrency(data.unallocatedAmount)}</div>
            </div>
          </div>
        </div>

        {/* Section 2: 4-Level Evidence Hierarchy Breakdown (DETERMINISTIC CHECK) */}
        <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
          <div className="text-[11px] font-bold text-purple-400 font-mono tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span>DETERMINISTIC CHECK — EVIDENCE HIERARCHY LEVELS</span>
            <span className="text-[10px] text-slate-400">Quality Score: {((data.evidenceQualityScore || 0.5)*100).toFixed(0)}/100</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {data.level1Evidence && data.level1Evidence.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono">Level 1 (Direct Financial Facts):</span>
                {data.level1Evidence.map((ev, i) => (
                  <div key={i} className="text-slate-300 pl-3 border-l-2 border-emerald-500/40 text-[11px] mt-0.5">{ev}</div>
                ))}
              </div>
            )}
            {data.level2Evidence && data.level2Evidence.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase font-mono">Level 2 (Transaction Metadata):</span>
                {data.level2Evidence.map((ev, i) => (
                  <div key={i} className="text-slate-300 pl-3 border-l-2 border-sky-500/40 text-[11px] mt-0.5">{ev}</div>
                ))}
              </div>
            )}
            {data.level4Evidence && data.level4Evidence.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">Level 4 (Communication Support Claims):</span>
                {data.level4Evidence.map((ev, i) => (
                  <div key={i} className="text-slate-300 pl-3 border-l-2 border-purple-500/40 text-[11px] mt-0.5">{ev}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: AI Analysis & Recommendation (AI ANALYSIS) */}
        <div className="space-y-3 bg-slate-950/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 font-mono">
              <Cpu className="w-3.5 h-3.5" /> AI ANALYSIS — PRIMARY HYPOTHESIS & REASONING
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Confidence: {(data.confidence * 100).toFixed(0)}%</span>
              {getHypothesisBadge(data.primaryHypothesis)}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-slate-200 leading-relaxed font-medium">
              <span className="text-slate-400 font-normal">Operational Rationale: </span>
              {data.reason}
            </div>

            {/* Alternative Hypotheses */}
            {data.alternativeHypotheses && data.alternativeHypotheses.length > 0 && (
              <div className="pt-1 text-[11px] text-slate-400">
                Secondary Hypotheses Considered:{' '}
                <span className="text-slate-300 font-mono">{data.alternativeHypotheses.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Recommended Financial Operator Action */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 bg-purple-950/30 p-3 rounded-lg border border-purple-900/40">
            <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">
              Recommended Operator Resolution:
            </div>
            <div className="text-xs font-semibold text-white mt-1">{data.recommendedAction}</div>
          </div>
        </div>

        {/* Section 4: Human Review Explanation Breakdown (HUMAN REVIEW) */}
        {data.humanReviewDetails && (
          <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-amber-900/60 pb-1.5">
              <span className="font-bold text-amber-300 font-mono text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> HUMAN REVIEW REQUIREMENT BREAKDOWN
              </span>
              {getPolicyBadge(data.policyDecision)}
            </div>
            <div className="space-y-1 text-[11px] text-amber-200/90">
              <div><strong>Why Required:</strong> {data.humanReviewDetails.whyRequired}</div>
              {data.humanReviewDetails.evidenceConflict && (
                <div className="text-rose-300"><strong>Evidence Conflict:</strong> {data.humanReviewDetails.evidenceConflict}</div>
              )}
              {data.humanReviewDetails.missingEvidence && (
                <div><strong>Missing Evidence:</strong> {data.humanReviewDetails.missingEvidence}</div>
              )}
              <div className="text-white font-medium"><strong>What Human Should Verify:</strong> {data.humanReviewDetails.whatHumanShouldVerify}</div>
            </div>
          </div>
        )}

        {/* Action Links */}
        <div className="flex gap-3 pt-2">
          {data.invoiceId && (
            <Link
              href={`/invoices/${data.invoiceId}`}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-lg transition-colors border border-slate-700 text-center"
            >
              Open Invoice Case
            </Link>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-colors border border-slate-700"
            >
              Close Intelligence View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
