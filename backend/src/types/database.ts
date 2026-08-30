export interface Business {
  id: string;
  name: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  billing_address?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  payment_terms?: string;
  credit_limit?: number;
  total_invoiced_amount?: number;
  total_paid_amount?: number;
  total_outstanding_amount?: number;
  total_overdue_amount?: number;
  total_promises_made?: number;
  total_broken_promises?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_number: string;
  description?: string;
  issue_date?: string;
  due_date: string;
  amount: number;
  currency?: string;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  priority?: string;
  priority_score?: number | null;
  priority_reason?: string | null;
  last_contacted_at?: string | null;
  next_action_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  business_id: string;
  customer_id: string;
  payment_reference?: string;
  external_event_id?: string;
  amount: number;
  currency?: string;
  payment_date: string;
  payment_method?: string;
  payment_status?: string;
  raw_reference?: any;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  allocated_amount: number;
  allocation_type?: string;
  confidence?: number;
  status?: string;
  created_at?: string;
}

export interface Communication {
  id: string;
  business_id?: string;
  customer_id: string;
  invoice_id?: string;
  direction: string; // OUTBOUND, INBOUND
  channel: string; // EMAIL, CALL, SMS
  message?: string;
  summary?: string;
  ai_interpreted?: boolean;
  intent?: string | null;
  extracted_amount?: number | null;
  extracted_date?: string | null;
  created_at?: string;
}

export interface PromiseToPay {
  id: string;
  business_id?: string;
  customer_id: string;
  invoice_id: string;
  promised_amount: number;
  promised_date: string;
  source?: string;
  original_message?: string;
  status: string; // ACTIVE, FULFILLED, BROKEN
  fulfilled_amount?: number;
  fulfilled_at?: string | null;
  broken_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReconciliationException {
  id: string;
  business_id?: string;
  invoice_id: string;
  payment_id: string;
  expected_amount: number;
  received_amount: number;
  difference?: number;
  discrepancy_amount?: number;
  exception_type?: string;
  ai_hypothesis?: string;
  ai_confidence?: number;
  deterministic_check?: string;
  status: string; // EXPLAINED, OPEN, RESOLVED
  human_review_required?: boolean;
  human_reviewed_by?: string | null;
  human_reviewed_at?: string | null;
  resolution_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AgentRun {
  id: string;
  agent_name: string;
  triggered_by?: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

export interface AgentDecision {
  id: string;
  agent_run_id: string;
  invoice_id?: string;
  customer_id?: string;
  decision_type: string;
  reasoning: string;
  confidence_score?: number;
  created_at?: string;
}

export interface Action {
  id: string;
  agent_decision_id?: string;
  action_type: string;
  target_entity?: string;
  target_id?: string;
  payload?: any;
  status: string;
  executed_at?: string;
}

export interface PolicyDecision {
  id: string;
  action_id?: string;
  policy_name: string;
  allowed: boolean;
  violation_reason?: string;
  evaluated_at?: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  details?: any;
  timestamp: string;
}

// View: invoice_working_view
export interface InvoiceWorkingView {
  id: string;
  business_id: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
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
  priority?: string;
  priority_score?: number | null;
  priority_reason?: string | null;
  active_promises_count?: number;
  open_exceptions_count?: number;
  created_at?: string;
  updated_at?: string;
}
