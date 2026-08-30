/**
 * LangGraph State Definition for Receivables Intelligence Agent
 */

export interface ReceivablesAgentState {
  // Identification
  businessId: string;
  invoiceId: string;
  customerId: string;

  // Invoice Financial Facts (Supabase Ground Truth)
  invoiceNumber: string;
  invoiceAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string;
  daysOverdue: number;
  invoiceStatus: string;

  // Customer Behaviour Signals
  customerName: string;
  averagePaymentDelay: number;
  totalInvoices: number;
  totalOverdueInvoices: number;
  totalPromises: number;
  totalBrokenPromises: number;
  creditLimit: number;

  // Relational Event History
  paymentCount: number;
  paymentHistory: any[];
  promiseCount: number;
  promiseHistory: any[];
  recentCommunications: any[];
  openExceptionCount: number;
  exceptionContext: any[];

  // Deterministic Baseline Signals
  hasBrokenPromise: boolean;
  hasOpenException: boolean;
  hasDispute: boolean;
  partialPaymentState: boolean;
  baselineScore: number;
  baselinePriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signalSummary: string[];

  // Agent AI Outputs
  agentPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priorityReason: string;
  evidence: string[];
  recommendedAction: string;
  confidence: number;

  // Policy & Control
  policyDecision: 'APPROVED' | 'REJECTED' | 'HUMAN_REVIEW';
  policyReason: string;
  agentRunId?: string;
  agentDecisionId?: string;
  workflowStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  error?: string;
}

export function createInitialState(invoiceId: string): ReceivablesAgentState {
  return {
    businessId: '',
    invoiceId,
    customerId: '',

    invoiceNumber: '',
    invoiceAmount: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    dueDate: '',
    daysOverdue: 0,
    invoiceStatus: 'UNKNOWN',

    customerName: '',
    averagePaymentDelay: 0,
    totalInvoices: 0,
    totalOverdueInvoices: 0,
    totalPromises: 0,
    totalBrokenPromises: 0,
    creditLimit: 0,

    paymentCount: 0,
    paymentHistory: [],
    promiseCount: 0,
    promiseHistory: [],
    recentCommunications: [],
    openExceptionCount: 0,
    exceptionContext: [],

    hasBrokenPromise: false,
    hasOpenException: false,
    hasDispute: false,
    partialPaymentState: false,
    baselineScore: 0,
    baselinePriority: 'LOW',
    signalSummary: [],

    agentPriority: 'LOW',
    priorityReason: '',
    evidence: [],
    recommendedAction: '',
    confidence: 0,

    policyDecision: 'HUMAN_REVIEW',
    policyReason: 'Workflow initialized',
    workflowStatus: 'PENDING',
  };
}
