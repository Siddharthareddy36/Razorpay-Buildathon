'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bot, Send, ShieldCheck, CheckCircle2, ArrowRight, RefreshCw, MessageSquare, RotateCcw, Building2, FileText, AlertTriangle } from 'lucide-react';
import { sendAgentQuery } from '../lib/api';
import { AgentQueryResponse, AssistantSessionContext } from '../types';

const QUICK_PROMPTS = [
  'Which invoices need attention?',
  'Why is INV-SYNTH-10002 important?',
  'What about its customer?',
  'Has this customer broken promises?',
  'Any payment issues?',
  'Start a new case',
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  queryResponse?: AgentQueryResponse;
  isError?: boolean;
  timestamp: string;
}

export default function ChatbotShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: 'Your Conversational Receivables Operations Copilot is ready. Ask about priority collection queues, accounts with highest exposure, broken promises, or payment reconciliation exceptions.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionContext, setSessionContext] = useState<AssistantSessionContext>({});

  const handleSubmit = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await sendAgentQuery(text, sessionContext);

      // Update active session context if returned from server
      if (res.context) {
        setSessionContext(res.context);
      }

      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: res.answer || res.message || 'Analysis complete.',
        queryResponse: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: err?.message || 'Receivables intelligence service is temporarily unavailable. Please try again.',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetContext = () => {
    setSessionContext({});
    handleSubmit('Start a new case');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col h-[580px]">
      {/* Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-sky-100 border border-sky-200 text-sky-700 rounded-lg">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              Receivables Operations Copilot
            </h2>
            <p className="text-[11px] text-slate-500">Multi-Turn Context & Policy Guardrails Active</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {sessionContext.currentInvoiceNumber && (
            <span className="text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
              <FileText className="w-3 h-3 text-sky-600" />
              {sessionContext.currentInvoiceNumber}
            </span>
          )}
          {sessionContext.currentCustomerName && (
            <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-600" />
              {sessionContext.currentCustomerName.slice(0, 18)}
            </span>
          )}
          {sessionContext.currentPromiseId && (
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Promise Active
            </span>
          )}
          <div className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Grounded</span>
          </div>
        </div>
      </div>

      {/* Subtle Active Context Indicator Bar */}
      {(sessionContext.currentInvoiceNumber || sessionContext.currentCustomerName || sessionContext.currentPromiseId) && (
        <div className="px-3 py-1.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between text-[11px] text-sky-900">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-500">Active Case Context:</span>
            {sessionContext.currentInvoiceNumber && (
              <span className="font-mono font-bold text-sky-800">{sessionContext.currentInvoiceNumber}</span>
            )}
            {sessionContext.currentInvoiceNumber && sessionContext.currentCustomerName && <span>•</span>}
            {sessionContext.currentCustomerName && (
              <span className="font-medium text-slate-700">{sessionContext.currentCustomerName}</span>
            )}
            {sessionContext.currentPromiseId && (
              <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                Promise Attached
              </span>
            )}
          </div>
          <button
            onClick={handleResetContext}
            className="text-[10px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Clear Case Context
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-xl p-3.5 text-xs shadow-2xs ${
                msg.sender === 'user'
                  ? 'bg-sky-700 text-white rounded-br-none'
                  : msg.isError
                  ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-none space-y-2'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none space-y-2.5'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-slate-400">
                <span className="font-bold flex items-center gap-1.5">
                  {msg.sender === 'user' ? 'You' : 'Receivables Assistant'}
                  {msg.queryResponse?.sourceLabel && (
                    <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-bold tracking-wide">
                      {msg.queryResponse.sourceLabel}
                    </span>
                  )}
                  {msg.queryResponse?.latencyMs && (
                    <span className="text-[9px] text-slate-400 font-mono">
                      ({msg.queryResponse.latencyMs}ms)
                    </span>
                  )}
                </span>
                <span className="font-mono">{msg.timestamp}</span>
              </div>

              <p className="leading-relaxed text-xs font-medium whitespace-pre-line">{msg.text}</p>

              {/* Error Retry Action */}
              {msg.isError && (
                <button
                  onClick={() => handleSubmit('Which invoices need attention?')}
                  className="inline-flex items-center space-x-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-white px-2.5 py-1 rounded border border-rose-200 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Request</span>
                </button>
              )}

              {/* Structured Recommendation & Policy Footer */}
              {msg.queryResponse && (msg.queryResponse.recommendation || msg.queryResponse.policy) && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px]">
                  {msg.queryResponse.recommendation && (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium">
                      <strong className="text-slate-900">Recommendation: </strong>
                      {msg.queryResponse.recommendation}
                    </div>
                  )}
                  {msg.queryResponse.policy && (
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className="font-bold text-slate-500 uppercase">Policy Check:</span>
                      <span className={`px-2 py-0.5 rounded font-bold border ${
                        msg.queryResponse.policy === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {msg.queryResponse.policy}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Render Structured Portfolio Priority Cards */}
              {msg.queryResponse?.intent === 'PORTFOLIO_PRIORITY' && msg.queryResponse.data?.rankedInvoices && (
                <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500">
                    <span>Prioritized Collection Queue</span>
                    <span>Top {msg.queryResponse.data.rankedInvoices.length} Accounts</span>
                  </div>
                  {msg.queryResponse.data.rankedInvoices.map((inv: any, idx: number) => {
                    const invNum = inv.invoiceNumber || inv.invoice_number || `INV-${1000 + idx}`;
                    const custName = inv.customerName || inv.customer_name || 'Customer Account';
                    const amount = inv.outstandingAmount ?? inv.amount ?? 0;
                    const daysOverdue = inv.daysOverdue ?? inv.days_overdue ?? 0;
                    const priority = inv.agentPriority || inv.priority || 'CRITICAL';
                    const invId = inv.invoiceId || inv.id || invNum;

                    return (
                      <div key={invNum + idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">#{inv.rank || (idx + 1)}</span>
                            <span>{invNum}</span>
                            <span className="text-slate-500 font-normal">({custName})</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            priority === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {priority}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>Outstanding: <strong className="text-slate-900">₹{amount.toLocaleString('en-IN')}</strong></span>
                          <span>Overdue: <strong className="text-rose-700">{daysOverdue} days</strong></span>
                        </div>

                        {(inv.priorityReason || inv.priority_reason) && (
                          <p className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-100">
                            &quot;{inv.priorityReason || inv.priority_reason}&quot;
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Policy: {inv.policyDecision || 'APPROVED'}
                          </span>
                          <Link href={`/invoices/${encodeURIComponent(invId)}`} className="text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1">
                            Inspect Case <ArrowRight className="w-3 h-3" />
                          </Link>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-slate-600 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center space-x-2 shadow-2xs">
              <Bot className="w-4 h-4 animate-spin text-sky-700" />
              <span>Resolving context and retrieving live Supabase ground truth...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-2 bg-white border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[11px] text-slate-500 shrink-0 font-medium">Quick Prompts:</span>
        {QUICK_PROMPTS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSubmit(q)}
            disabled={loading}
            className="text-[11px] bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors font-medium cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(inputQuery);
        }}
        className="p-2.5 bg-white border-t border-slate-200 flex gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          disabled={loading}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask 'Why is INV-SYNTH-10002 important?', 'What about its customer?', or 'Start a new case'..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 disabled:opacity-50 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || loading}
          className="px-4 py-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-bold text-xs transition-colors flex items-center space-x-1 shadow-2xs cursor-pointer"
        >
          <span>Ask</span>
          <Send className="w-3 h-3 ml-1" />
        </button>
      </form>
    </div>
  );
}
