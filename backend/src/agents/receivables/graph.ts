import { createInitialState, ReceivablesAgentState } from './state.js';
import { loadContextNode } from './nodes/load-context.js';
import { buildSignalsNode } from './nodes/build-signals.js';
import { analyzeNode, validateOutputSchema } from './nodes/analyze.js';
import { policyCheckNode } from './nodes/policy.js';
import { persistDecisionNode } from './nodes/persist.js';
import { auditNode } from './nodes/audit.js';

export async function runReceivablesAgentGraph(invoiceId: string): Promise<ReceivablesAgentState> {
  let state = createInitialState(invoiceId);

  // 1. LOAD_CONTEXT Node
  const contextUpdate = await loadContextNode(state);
  state = { ...state, ...contextUpdate };

  if (state.workflowStatus === 'FAILED') {
    state = { ...state, ...(await persistDecisionNode(state)), ...(await auditNode(state)) };
    return state;
  }

  // 2. BUILD_SIGNALS & BASELINE Node
  const signalsUpdate = buildSignalsNode(state);
  state = { ...state, ...signalsUpdate };

  // 3. RECEIVABLES_AGENT (LLM / Reasoning Engine) Node
  const analyzeUpdate = await analyzeNode(state);
  state = { ...state, ...analyzeUpdate };

  // 4. VALIDATE_OUTPUT Node
  const isValid = validateOutputSchema({
    priority: state.agentPriority,
    priorityReason: state.priorityReason,
    evidence: state.evidence,
    recommendedAction: state.recommendedAction,
    confidence: state.confidence,
  });

  if (!isValid) {
    state.policyDecision = 'HUMAN_REVIEW';
    state.policyReason = 'Validation Error: LLM output did not pass strict schema validation rules.';
  } else {
    // 5. POLICY_CHECK Node
    const policyUpdate = policyCheckNode(state);
    state = { ...state, ...policyUpdate };
  }

  // 6. PERSIST_DECISION Node
  const persistUpdate = await persistDecisionNode(state);
  state = { ...state, ...persistUpdate };

  // 7. AUDIT Node
  const auditUpdate = await auditNode(state);
  state = { ...state, ...auditUpdate };

  state.workflowStatus = 'COMPLETED';
  return state;
}
