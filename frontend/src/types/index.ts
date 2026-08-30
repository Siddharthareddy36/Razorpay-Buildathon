export interface DashboardSummary {
  revenueAtRisk: number;
  outstandingAmount: number;
  overdueInvoiceCount: number;
  activePromiseCount: number;
  openExceptionCount: number;
  customerCount: number;
}

export interface InvoiceWorkingViewItem {
  id: string;
  business_id: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_risk_score?: number;
  invoice_number: string;
  description?: string;
  issue_date?: string;
  due_date: string;
  amount: number;
  currency?: string;
  paid_amount: number;
  outstanding_amount: number;
  days_overdue: number;
  status: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  priority_score?: number | null;
  priority_reason?: string | null;
  active_promises_count?: number;
  open_exceptions_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentItem {
  id: string;
  allocation_id?: string;
  payment_id?: string;
  invoice_id?: string;
  payment_reference?: string;
  amount: number;
  allocated_amount?: number;
  currency?: string;
  payment_method?: string;
  payment_status?: string;
  reference_number?: string;
  payment_date: string;
  status?: string;
}

export interface PromiseItem {
  id: string;
  customer_id: string;
  invoice_id: string;
  promised_amount: number;
  promised_date: string;
  source?: string;
  original_message?: string;
  status: string; // ACTIVE, FULFILLED, BROKEN
  fulfilled_amount?: number;
  broken_reason?: string | null;
  created_at?: string;
}

export interface CommunicationItem {
  id: string;
  customer_id: string;
  invoice_id?: string;
  channel: string;
  direction: string;
  message?: string;
  summary?: string;
  sentiment?: string;
  timestamp?: string;
  created_at?: string;
}

export interface ReconciliationExceptionItem {
  id: string;
  invoice_id: string;
  payment_id: string;
  expected_amount: number;
  received_amount: number;
  difference?: number;
  discrepancy_amount?: number;
  exception_type?: string;
  ai_hypothesis?: string;
  ai_confidence?: number;
  reason?: string;
  status: string;
  created_at?: string;
}

export interface DatabaseHealthStatus {
  connected: boolean;
  tablesVerified: boolean;
  message?: string;
  tableCounts?: Record<string, number | null>;
  countMismatches?: Record<string, { expected: number; actual: number | null }>;
}

export interface AssistantSessionContext {
  currentInvoiceId?: string | null;
  currentInvoiceNumber?: string | null;
  currentCustomerId?: string | null;
  currentCustomerName?: string | null;
  currentPromiseId?: string | null;
  currentPromiseContext?: any | null;
  currentPaymentId?: string | null;
  currentExceptionId?: string | null;
  lastReferencedEntity?: string | null;
  lastReferencedEntityType?: 'INVOICE' | 'CUSTOMER' | 'PROMISE' | 'PAYMENT' | 'EXCEPTION' | null;
}

export interface AgentQueryResponse {
  success: boolean;
  intent?: string;
  answer?: string;
  data?: any;
  source?: string;
  sourceLabel?: string;
  message?: string;
  timestamp?: string;
  latencyMs?: number;
  context?: AssistantSessionContext;
  facts?: any;
  recommendation?: string;
  policy?: string;
}
