import { ReceivablesAgentState } from '../state.js';

export interface AgentStructuredOutput {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priorityReason: string;
  evidence: string[];
  recommendedAction: string;
  confidence: number;
}

export async function analyzeNode(state: ReceivablesAgentState): Promise<Partial<ReceivablesAgentState>> {
  try {
    // 1. Prepare normalized context object for LLM prompt
    const normalizedContext = {
      invoice: {
        number: state.invoiceNumber,
        amount: state.invoiceAmount,
        paid: state.paidAmount,
        outstanding: state.outstandingAmount,
        daysOverdue: state.daysOverdue,
        dueDate: state.dueDate,
        status: state.invoiceStatus,
      },
      customer: {
        name: state.customerName,
        averagePaymentDelayDays: state.averagePaymentDelay,
        totalInvoices: state.totalInvoices,
        overdueInvoices: state.totalOverdueInvoices,
        totalPromises: state.totalPromises,
        brokenPromises: state.totalBrokenPromises,
        creditLimit: state.creditLimit,
      },
      signals: {
        hasBrokenPromise: state.hasBrokenPromise,
        hasOpenException: state.hasOpenException,
        hasDispute: state.hasDispute,
        partialPayment: state.partialPaymentState,
        baselineScore: state.baselineScore,
        baselinePriority: state.baselinePriority,
      },
      events: {
        paymentCount: state.paymentCount,
        promiseCount: state.promiseCount,
        communicationCount: state.recentCommunications.length,
        openExceptionCount: state.openExceptionCount,
      },
    };

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const provider = process.env.LLM_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai');

    let output: AgentStructuredOutput | null = null;

    if (apiKey && apiKey.trim().length > 0) {
      output = await callLLMProvider(normalizedContext, provider, apiKey);
    }

    // Deterministic Reasoning Engine (used when no API key is provided or on provider error)
    if (!output) {
      output = generateDeterministicAssessment(state);
    }

    return {
      agentPriority: output.priority,
      priorityReason: output.priorityReason,
      evidence: output.evidence,
      recommendedAction: output.recommendedAction,
      confidence: output.confidence,
    };
  } catch (err: any) {
    const fallback = generateDeterministicAssessment(state);
    return {
      agentPriority: fallback.priority,
      priorityReason: `[Fallback Assessment] ${fallback.priorityReason}`,
      evidence: fallback.evidence,
      recommendedAction: fallback.recommendedAction,
      confidence: 0.70,
    };
  }
}

/**
 * Call external LLM provider (Gemini / OpenAI API) with structured prompt
 */
async function callLLMProvider(context: any, provider: string, apiKey: string): Promise<AgentStructuredOutput | null> {
  const prompt = `You are an expert Receivables Intelligence Agent for B2B financial operations.
Analyze the following normalized customer invoice context and output a JSON assessment for collections prioritization.

Rules:
1. Do NOT invent invoice amounts, dates, or payment facts.
2. Return ONLY valid JSON matching this schema:
{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "priorityReason": "Concise summary of why this invoice has this priority",
  "evidence": ["Bullet point 1 referencing facts", "Bullet point 2 referencing facts"],
  "recommendedAction": "Concrete next step for collection operations",
  "confidence": 0.95
}

Context JSON:
${JSON.stringify(context, null, 2)}`;

  try {
    let responseText = '';

    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      const data = (await res.json()) as any;
      responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });
      const data = (await res.json()) as any;
      responseText = data?.choices?.[0]?.message?.content || '';
    }

    if (!responseText) return null;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (validateOutputSchema(parsed)) {
      return parsed as AgentStructuredOutput;
    }
  } catch {
    // Return null on network or parse failure to trigger fallback
  }

  return null;
}

/**
 * Validate LLM output schema strictly
 */
export function validateOutputSchema(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (!validPriorities.includes(data.priority)) return false;
  if (typeof data.priorityReason !== 'string' || !data.priorityReason.trim()) return false;
  if (!Array.isArray(data.evidence) || data.evidence.length === 0) return false;
  if (typeof data.recommendedAction !== 'string' || !data.recommendedAction.trim()) return false;
  if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) return false;
  return true;
}

/**
 * Deterministic AI Reasoning Engine fallback
 */
function generateDeterministicAssessment(state: ReceivablesAgentState): AgentStructuredOutput {
  const priority = state.baselinePriority;
  const evidence: string[] = [];
  let reason = '';
  let action = '';

  const amtFormatted = `₹${state.outstandingAmount.toLocaleString('en-IN')}`;

  if (state.daysOverdue > 0) {
    evidence.push(`Invoice ${state.invoiceNumber} is ${state.daysOverdue} days overdue with outstanding balance of ${amtFormatted}.`);
  } else {
    evidence.push(`Invoice ${state.invoiceNumber} has outstanding balance of ${amtFormatted} and is not yet overdue.`);
  }

  if (state.totalBrokenPromises > 0) {
    evidence.push(`Customer ${state.customerName} has ${state.totalBrokenPromises} historical broken payment promise(s).`);
  }

  if (state.hasOpenException) {
    evidence.push(`Open reconciliation exception (short pay / TDS discrepancy) requires account verification.`);
  }

  if (state.hasDispute) {
    evidence.push(`Recent communications indicate active customer inquiry or payment dispute.`);
  }

  if (state.partialPaymentState) {
    evidence.push(`Partial payment of ₹${state.paidAmount.toLocaleString('en-IN')} has been credited.`);
  }

  if (priority === 'CRITICAL') {
    reason = `High-exposure receivable (${amtFormatted}) is ${state.daysOverdue} days past due with elevated account risk signals.`;
    action = `Escalate immediately to senior credit manager for formal outreach and payment commitment confirmation.`;
  } else if (priority === 'HIGH') {
    reason = `Overdue balance of ${amtFormatted} (${state.daysOverdue} days past due) requires active collection follow-up.`;
    action = `Issue formal payment reminder and contact customer accounts payable team.`;
  } else if (priority === 'MEDIUM') {
    reason = `Account carrying balance of ${amtFormatted} requires standard collection monitoring.`;
    action = `Send standard automated payment reminder notice.`;
  } else {
    reason = `Current invoice carrying ${amtFormatted} balance within normal terms.`;
    action = `Maintain regular ledger monitoring until due date.`;
  }

  return {
    priority,
    priorityReason: reason,
    evidence,
    recommendedAction: action,
    confidence: 0.92,
  };
}
