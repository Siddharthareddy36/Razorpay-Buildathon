import crypto from 'crypto';
import { getSupabaseClient } from '../../../lib/supabase.js';
import { ReceivablesAgentState } from '../state.js';

export async function persistDecisionNode(state: ReceivablesAgentState): Promise<Partial<ReceivablesAgentState>> {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const agentRunId = crypto.randomUUID();

    // 1. Insert into agent_runs
    const { error: runError } = await supabase
      .from('agent_runs')
      .insert({
        id: agentRunId,
        business_id: state.businessId || '10000000-0000-4000-8000-000000000001',
        agent_type: 'RECEIVABLES_INTELLIGENCE',
        trigger_type: 'SCHEDULED',
        entity_type: 'INVOICE',
        entity_id: state.invoiceId,
        status: state.workflowStatus === 'FAILED' ? 'FAILED' : 'COMPLETED',
        input_context: {
          invoiceNumber: state.invoiceNumber,
          customerName: state.customerName,
          outstandingAmount: state.outstandingAmount,
          daysOverdue: state.daysOverdue,
          baselineScore: state.baselineScore,
          baselinePriority: state.baselinePriority,
        },
        output: {
          priority: state.agentPriority,
          reason: state.priorityReason,
          evidence: state.evidence,
          recommendedAction: state.recommendedAction,
          policyDecision: state.policyDecision,
        },
        reasoning_summary: state.priorityReason,
        started_at: now,
        completed_at: now,
        error_message: state.error || null,
      });

    if (runError) {
      console.error('Failed to insert agent_run:', runError.message);
    }

    // 2. Insert into agent_decisions
    const agentDecisionId = crypto.randomUUID();
    const { error: decError } = await supabase
      .from('agent_decisions')
      .insert({
        id: agentDecisionId,
        agent_run_id: agentRunId,
        business_id: state.businessId || '10000000-0000-4000-8000-000000000001',
        agent_type: 'RECEIVABLES_INTELLIGENCE',
        entity_type: 'INVOICE',
        entity_id: state.invoiceId,
        decision_type: 'PRIORITY_ASSESSMENT',
        decision: state.agentPriority,
        reason: state.priorityReason,
        confidence: state.confidence,
        evidence: state.evidence,
        created_at: now,
      });

    if (decError) {
      console.error('Failed to insert agent_decision:', decError.message);
    }

    return {
      agentRunId,
      agentDecisionId,
      workflowStatus: state.workflowStatus === 'FAILED' ? 'FAILED' : 'COMPLETED',
    };
  } catch (err: any) {
    console.error('Persistence Exception:', err?.message || err);
    return {
      workflowStatus: 'COMPLETED',
    };
  }
}
