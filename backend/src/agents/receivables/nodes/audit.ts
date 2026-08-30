import crypto from 'crypto';
import { getSupabaseClient } from '../../../lib/supabase.js';
import { ReceivablesAgentState } from '../state.js';

export async function auditNode(state: ReceivablesAgentState): Promise<Partial<ReceivablesAgentState>> {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { error } = await supabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      business_id: state.businessId || '10000000-0000-4000-8000-000000000001',
      actor_type: 'AGENT',
      actor_id: 'ReceivablesIntelligenceAgent',
      event_type: 'RECEIVABLES_AGENT_EVALUATION',
      entity_type: 'INVOICE',
      entity_id: state.invoiceId,
      description: `Evaluated invoice ${state.invoiceNumber} (${state.customerName}) -> Priority: ${state.agentPriority}, Policy: ${state.policyDecision}`,
      metadata: {
        invoiceNumber: state.invoiceNumber,
        customerName: state.customerName,
        outstandingAmount: state.outstandingAmount,
        daysOverdue: state.daysOverdue,
        baselinePriority: state.baselinePriority,
        baselineScore: state.baselineScore,
        agentPriority: state.agentPriority,
        priorityReason: state.priorityReason,
        recommendedAction: state.recommendedAction,
        policyDecision: state.policyDecision,
        confidence: state.confidence,
        agentRunId: state.agentRunId,
        agentDecisionId: state.agentDecisionId,
      },
      created_at: now,
    });

    if (error) {
      console.error('Audit Log Insertion Error:', error.message);
    }
  } catch (err: any) {
    console.error('Audit Log Insertion Exception:', err?.message || err);
  }

  return {};
}
