import { ReceivablesAgentState } from '../state.js';

export function policyCheckNode(state: ReceivablesAgentState): Partial<ReceivablesAgentState> {
  // Rule 1: Paid invoice check
  if (state.outstandingAmount <= 0 || state.invoiceStatus === 'PAID') {
    return {
      agentPriority: 'LOW',
      recommendedAction: 'No collection action required (Invoice is fully paid).',
      policyDecision: 'APPROVED',
      policyReason: 'Policy Rule: Paid invoices automatically bypass collection escalation.',
    };
  }

  // Rule 2: Low confidence check
  if (state.confidence < 0.60) {
    return {
      policyDecision: 'HUMAN_REVIEW',
      policyReason: 'Policy Rule: Confidence score below 0.60 safety threshold requires human review.',
    };
  }

  // Rule 3: Disputed invoice check
  if (state.hasDispute) {
    return {
      policyDecision: 'HUMAN_REVIEW',
      policyReason: 'Policy Rule: Active dispute or payment inquiry detected. Escalation paused for human account review.',
      recommendedAction: 'Assign to account manager to resolve dispute before initiating collections.',
    };
  }

  // Rule 4: Workflow error check
  if (state.workflowStatus === 'FAILED' || state.error) {
    return {
      policyDecision: 'HUMAN_REVIEW',
      policyReason: `Policy Rule: Context loading or agent evaluation error: ${state.error}`,
    };
  }

  // Default: Approved
  return {
    policyDecision: 'APPROVED',
    policyReason: 'Policy Rule: Assessment validated against all deterministic financial safety guardrails.',
  };
}
