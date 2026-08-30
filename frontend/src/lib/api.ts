import {
  DashboardSummary,
  InvoiceWorkingViewItem,
  PaymentItem,
  PromiseItem,
  CommunicationItem,
  ReconciliationExceptionItem,
  DatabaseHealthStatus,
  AgentQueryResponse,
  AssistantSessionContext,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    let errBody: any = null;
    if (isJson) {
      try {
        errBody = await res.json();
        if (errBody.error === 'P2P_CONTEXT_UNAVAILABLE') {
          errorMsg = 'Promise-to-Pay Intelligence is temporarily unavailable while payment context is being loaded. Please retry.';
        } else if (errBody.detail) {
          errorMsg = errBody.detail;
        } else if (errBody.error) {
          errorMsg = errBody.error;
        } else if (errBody.message) {
          errorMsg = errBody.message;
        }
      } catch {
        // Ignore JSON parse error
      }
    } else {
      if (res.status === 503) {
        errorMsg = 'Agent microservice is currently unavailable (HTTP 503).';
      } else if (res.status === 504) {
        errorMsg = 'Agent execution timed out. Please retry.';
      } else {
        errorMsg = `Agent service returned HTTP ${res.status}.`;
      }
    }
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.error = errBody?.error;
    err.detail = errBody?.detail || errBody?.message;
    err.stage = errBody?.stage;
    err.component = errBody?.component;
    throw err;
  }

  if (!isJson) {
    throw new Error(`Agent service returned non-JSON response.`);
  }

  return res.json();
}

export async function fetchDatabaseHealth(): Promise<DatabaseHealthStatus> {
  return fetchJson<DatabaseHealthStatus>(`${API_BASE_URL}/health/database`);
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return fetchJson<DashboardSummary>(`${API_BASE_URL}/dashboard/summary`);
}

export async function fetchDashboardPromises(): Promise<PromiseItem[]> {
  return fetchJson<PromiseItem[]>(`${API_BASE_URL}/dashboard/promises`);
}

export async function fetchDashboardExceptions(): Promise<ReconciliationExceptionItem[]> {
  return fetchJson<ReconciliationExceptionItem[]>(`${API_BASE_URL}/dashboard/exceptions`);
}

export async function fetchCustomers(): Promise<any[]> {
  return fetchJson<any[]>(`${API_BASE_URL}/customers`);
}

export async function fetchCustomerById(id: string): Promise<any> {
  return fetchJson<any>(`${API_BASE_URL}/customers/${id}`);
}

export async function fetchInvoices(): Promise<InvoiceWorkingViewItem[]> {
  return fetchJson<InvoiceWorkingViewItem[]>(`${API_BASE_URL}/invoices`);
}

export async function fetchInvoiceById(id: string): Promise<InvoiceWorkingViewItem> {
  return fetchJson<InvoiceWorkingViewItem>(`${API_BASE_URL}/invoices/${id}`);
}

export async function fetchInvoicePayments(id: string): Promise<PaymentItem[]> {
  return fetchJson<PaymentItem[]>(`${API_BASE_URL}/invoices/${id}/payments`);
}

export async function fetchInvoicePromises(id: string): Promise<PromiseItem[]> {
  return fetchJson<PromiseItem[]>(`${API_BASE_URL}/invoices/${id}/promises`);
}

export async function fetchInvoiceCommunications(id: string): Promise<CommunicationItem[]> {
  return fetchJson<CommunicationItem[]>(`${API_BASE_URL}/invoices/${id}/communications`);
}

export async function fetchInvoiceExceptions(id: string): Promise<ReconciliationExceptionItem[]> {
  return fetchJson<ReconciliationExceptionItem[]>(`${API_BASE_URL}/invoices/${id}/exceptions`);
}

export async function sendAgentQuery(query: string, context?: AssistantSessionContext): Promise<AgentQueryResponse> {
  return fetchJson<AgentQueryResponse>(`${API_BASE_URL}/agent/query`, {
    method: 'POST',
    body: JSON.stringify({ query, context }),
  });
}

export async function runReceivablesAgent(invoiceId: string): Promise<any> {
  return fetchJson<any>(`${API_BASE_URL}/agents/receivables/run`, {
    method: 'POST',
    body: JSON.stringify({ invoiceId }),
  });
}

export async function runPromiseAgent(params: { promiseId?: string; invoiceId?: string; invoiceNumber?: string }): Promise<any> {
  return fetchJson<any>(`${API_BASE_URL}/agents/promises/run`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function runReconciliationAgent(params: { exceptionId?: string; invoiceId?: string; invoiceNumber?: string }): Promise<any> {
  return fetchJson<any>(`${API_BASE_URL}/agents/reconciliation/run`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function runSupervisorAgent(params: { query?: string; invoiceNumber?: string; customerId?: string }): Promise<any> {
  return fetchJson<any>(`${API_BASE_URL}/agents/supervisor/run`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
