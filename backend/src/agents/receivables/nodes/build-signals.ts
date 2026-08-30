import { ReceivablesAgentState } from '../state.js';

export function buildSignalsNode(state: ReceivablesAgentState): Partial<ReceivablesAgentState> {
  const hasBrokenPromise = state.totalBrokenPromises > 0 || state.promiseHistory.some((p) => p.status === 'BROKEN');
  const hasOpenException = state.openExceptionCount > 0 || state.exceptionContext.some((e) => e.status === 'OPEN' || e.status === 'EXPLAINED');
  
  const hasDispute = state.recentCommunications.some((c) => {
    const msg = (c.message || '').toLowerCase();
    return msg.includes('dispute') || msg.includes('incorrect') || msg.includes('wrong invoice') || msg.includes('short pay');
  });

  const partialPaymentState = state.paidAmount > 0 && state.outstandingAmount > 0;

  // Compute Baseline Score
  const exposureScore = Math.min(35, (state.outstandingAmount / 1000000) * 35);
  const overdueScore = Math.min(40, state.daysOverdue * 1.25);
  const brokenPromiseScore = Math.min(15, state.totalBrokenPromises * 7.5);
  const exceptionScore = hasOpenException || hasDispute ? 10 : 0;

  const rawBaselineScore = exposureScore + overdueScore + brokenPromiseScore + exceptionScore;
  const baselineScore = Math.min(100, Math.round(rawBaselineScore * 10) / 10);

  let baselinePriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (baselineScore >= 70 || state.daysOverdue > 60 || state.totalBrokenPromises > 1) {
    baselinePriority = 'CRITICAL';
  } else if (baselineScore >= 45 || state.daysOverdue > 30) {
    baselinePriority = 'HIGH';
  } else if (baselineScore >= 20 || state.daysOverdue > 0) {
    baselinePriority = 'MEDIUM';
  } else {
    baselinePriority = 'LOW';
  }

  const signalSummary: string[] = [
    `Outstanding: ₹${state.outstandingAmount.toLocaleString('en-IN')}`,
    `Days Overdue: ${state.daysOverdue} days`,
  ];

  if (hasBrokenPromise) signalSummary.push(`Broken Promise Flagged (${state.totalBrokenPromises})`);
  if (hasOpenException) signalSummary.push(`Open Reconciliation Exception Flagged`);
  if (hasDispute) signalSummary.push(`Dispute/Deduction Indicator Detected`);
  if (partialPaymentState) signalSummary.push(`Partial Payment Recorded (₹${state.paidAmount.toLocaleString('en-IN')})`);

  return {
    hasBrokenPromise,
    hasOpenException,
    hasDispute,
    partialPaymentState,
    baselineScore,
    baselinePriority,
    signalSummary,
  };
}
