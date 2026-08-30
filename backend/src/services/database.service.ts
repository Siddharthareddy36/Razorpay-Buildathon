import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export const REQUIRED_TABLES = [
  'businesses',
  'customers',
  'invoices',
  'payments',
  'payment_allocations',
  'communications',
  'promises',
  'reconciliation_exceptions',
  'agent_runs',
  'agent_decisions',
  'actions',
  'policy_decisions',
  'audit_logs',
];

export const EXPECTED_COUNTS: Record<string, number> = {
  businesses: 5,
  customers: 25,
  invoices: 70,
  payments: 22,
  payment_allocations: 18,
  communications: 70,
  promises: 29,
  reconciliation_exceptions: 6,
};

export class DatabaseService {
  /**
   * Verify database connection and query table row counts.
   */
  static async checkHealth() {
    if (!isSupabaseConfigured()) {
      return {
        connected: false,
        tablesVerified: false,
        message: 'Supabase credentials not configured in environment (.env)',
      };
    }

    const supabase = getSupabaseClient();
    const tableCounts: Record<string, number | null> = {};
    const countMismatches: Record<string, { expected: number; actual: number | null }> = {};
    let allVerified = true;

    for (const table of REQUIRED_TABLES) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          allVerified = false;
          tableCounts[table] = null;
        } else {
          tableCounts[table] = count;
          if (EXPECTED_COUNTS[table] !== undefined && count !== EXPECTED_COUNTS[table]) {
            countMismatches[table] = {
              expected: EXPECTED_COUNTS[table],
              actual: count,
            };
          }
        }
      } catch (err) {
        allVerified = false;
        tableCounts[table] = null;
      }
    }

    // Check view
    let viewVerified = false;
    try {
      const { error: viewError } = await supabase.from('invoice_working_view').select('*', { count: 'exact', head: true });
      viewVerified = !viewError;
    } catch {
      viewVerified = false;
    }

    return {
      connected: allVerified,
      tablesVerified: allVerified && viewVerified,
      tableCounts,
      countMismatches: Object.keys(countMismatches).length > 0 ? countMismatches : undefined,
    };
  }

  /**
   * Authoritative helper to filter overdue invoices consistently across dashboard and assistant:
   * OVERDUE = outstanding_amount > 0 AND (days_overdue > 0 OR status IN ('overdue', 'OVERDUE') OR due_date in past)
   */
  static isInvoiceOverdue(inv: any): boolean {
    const outstanding = Number(inv.outstanding_amount ?? (inv.amount - (inv.paid_amount || 0)));
    if (outstanding <= 0) return false;
    const days = Number(inv.days_overdue ?? 0);
    const status = String(inv.status || '').toLowerCase();
    const isPastDue = inv.due_date ? new Date(inv.due_date) < new Date() : false;
    return days > 0 || status === 'overdue' || isPastDue;
  }

  /**
   * Get Dashboard Metrics & Key Performance Indicators
   */
  static async getDashboardSummary() {
    const supabase = getSupabaseClient();

    const { data: viewData, error: viewError } = await supabase
      .from('invoice_working_view')
      .select('*');

    const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    const { count: activePromiseCount } = await supabase
      .from('promises')
      .select('*', { count: 'exact', head: true })
      .in('status', ['ACTIVE', 'active', 'pending', 'PENDING']);

    const { count: openExceptionCount } = await supabase
      .from('reconciliation_exceptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['OPEN', 'open']);

    if (viewError || !viewData) {
      const { data: invoices } = await supabase.from('invoices').select('*');
      const invList = invoices || [];
      const totalOutstanding = invList.reduce((acc, inv) => acc + Math.max(0, inv.amount - (inv.paid_amount || 0)), 0);
      const overdueInvoices = invList.filter(DatabaseService.isInvoiceOverdue);
      const revenueAtRisk = overdueInvoices.reduce((acc, inv) => acc + Math.max(0, inv.amount - (inv.paid_amount || 0)), 0);

      return {
        revenueAtRisk,
        outstandingAmount: totalOutstanding,
        overdueInvoiceCount: overdueInvoices.length,
        activePromiseCount: activePromiseCount || 0,
        openExceptionCount: openExceptionCount || 0,
        customerCount: customerCount || 0,
      };
    }

    const items = viewData || [];
    const totalOutstanding = items.reduce((acc, inv) => acc + Math.max(0, Number(inv.outstanding_amount || (inv.amount - inv.paid_amount))), 0);
    const overdueItems = items.filter(DatabaseService.isInvoiceOverdue);
    const revenueAtRisk = overdueItems.reduce((acc, inv) => acc + Math.max(0, Number(inv.outstanding_amount || (inv.amount - inv.paid_amount))), 0);

    return {
      revenueAtRisk,
      outstandingAmount: totalOutstanding,
      overdueInvoiceCount: overdueItems.length,
      activePromiseCount: activePromiseCount || 0,
      openExceptionCount: openExceptionCount || 0,
      customerCount: customerCount || 0,
    };
  }

  /**
   * Get Businesses
   */
  static async getBusinesses() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('businesses').select('*');
    if (error) throw error;
    return data || [];
  }

  /**
   * Get Customers
   */
  static async getCustomers() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    return data || [];
  }

  /**
   * Get Customer 360 Profile by ID
   */
  static async getCustomerById(id: string) {
    const supabase = getSupabaseClient();
    const { data: customer } = await supabase.from('customers').select('*').eq('id', id).single();
    if (!customer) return null;

    const { data: invoices } = await supabase.from('invoices').select('*').eq('customer_id', id);
    const { data: payments } = await supabase.from('payments').select('*').eq('customer_id', id);
    const { data: promises } = await supabase.from('promises').select('*').eq('customer_id', id);
    const { data: communications } = await supabase.from('communications').select('*').eq('customer_id', id);

    return {
      customer,
      invoices: invoices || [],
      payments: payments || [],
      promises: promises || [],
      communications: communications || [],
    };
  }

  /**
   * Get Invoices
   */
  static async getInvoices() {
    const supabase = getSupabaseClient();
    const { data: viewData, error: viewError } = await supabase
      .from('invoice_working_view')
      .select('*')
      .order('days_overdue', { ascending: false });

    if (!viewError && viewData) {
      const { data: customers } = await supabase.from('customers').select('id, name');
      const custMap = new Map((customers || []).map((c: any) => [c.id, c.name]));
      return viewData.map((inv: any) => ({
        ...inv,
        customer_name: custMap.get(inv.customer_id) || inv.customer_name || 'Unknown Customer',
      }));
    }

    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('*, customers(name, email)')
      .order('created_at', { ascending: false });

    if (invError) throw invError;

    const today = new Date();
    return (invoices || []).map((inv: any) => {
      const dueDate = new Date(inv.due_date);
      const diffTime = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      const outstanding = inv.amount - (inv.paid_amount || 0);

      return {
        id: inv.id,
        business_id: inv.business_id,
        customer_id: inv.customer_id,
        customer_name: inv.customers?.name || 'Unknown Customer',
        customer_email: inv.customers?.email || '',
        invoice_number: inv.invoice_number,
        amount: inv.amount,
        paid_amount: inv.paid_amount || 0,
        outstanding_amount: outstanding,
        due_date: inv.due_date,
        days_overdue: daysOverdue,
        status: inv.status,
        priority: daysOverdue > 30 ? 'HIGH' : daysOverdue > 14 ? 'MEDIUM' : 'LOW',
      };
    });
  }

  private static async resolveRealInvoiceId(idOrNumber: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);
    if (isUuid) return idOrNumber;
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('invoices').select('id').eq('invoice_number', idOrNumber).maybeSingle();
    return data?.id || idOrNumber;
  }

  /**
   * Get Single Invoice by ID or Invoice Number
   */
  static async getInvoiceById(idOrNumber: string) {
    const supabase = getSupabaseClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);

    const viewRes = isUuid
      ? await supabase.from('invoice_working_view').select('*').eq('id', idOrNumber).maybeSingle()
      : await supabase.from('invoice_working_view').select('*').eq('invoice_number', idOrNumber).maybeSingle();

    if (viewRes.data) return viewRes.data;

    const invRes = isUuid
      ? await supabase.from('invoices').select('*, customers(name, email, phone, credit_limit, risk_score)').eq('id', idOrNumber).maybeSingle()
      : await supabase.from('invoices').select('*, customers(name, email, phone, credit_limit, risk_score)').eq('invoice_number', idOrNumber).maybeSingle();

    const invoice = invRes.data;
    if (invRes.error || !invoice) return null;


    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    const diffTime = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    return {
      id: invoice.id,
      business_id: invoice.business_id,
      customer_id: invoice.customer_id,
      customer_name: invoice.customers?.name || 'Unknown Customer',
      customer_email: invoice.customers?.email || '',
      customer_phone: invoice.customers?.phone || '',
      customer_risk_score: invoice.customers?.risk_score,
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      paid_amount: invoice.paid_amount || 0,
      outstanding_amount: invoice.amount - (invoice.paid_amount || 0),
      due_date: invoice.due_date,
      days_overdue: daysOverdue,
      status: invoice.status,
      created_at: invoice.created_at,
    };
  }

  /**
   * Get All Promises for Dashboard
   */
  static async getAllPromises() {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('promises').select('*').order('created_at', { ascending: false });
    return data || [];
  }

  /**
   * Get All Exceptions for Dashboard
   */
  static async getAllExceptions() {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('reconciliation_exceptions').select('*').order('created_at', { ascending: false });
    return data || [];
  }

  /**
   * Get Payments for Invoice
   */
  static async getInvoicePayments(invoiceIdOrNumber: string) {
    const supabase = getSupabaseClient();
    const invoiceId = await DatabaseService.resolveRealInvoiceId(invoiceIdOrNumber);

    const { data: allocations, error: allocError } = await supabase
      .from('payment_allocations')
      .select('*, payments(*)')
      .eq('invoice_id', invoiceId);

    if (!allocError && allocations && allocations.length > 0) {
      return allocations.map((a: any) => ({
        id: a.payments?.id || a.id,
        allocation_id: a.id,
        payment_id: a.payment_id,
        invoice_id: a.invoice_id,
        amount: a.payments?.amount || a.allocated_amount,
        allocated_amount: a.allocated_amount,
        payment_method: a.payments?.payment_method || 'Bank Transfer',
        reference_number: a.payments?.reference_number || '-',
        payment_date: a.payments?.payment_date || a.allocated_at,
        status: a.payments?.status || 'completed',
      }));
    }

    const { data: invoice } = await supabase.from('invoices').select('customer_id').eq('id', invoiceId).single();
    if (invoice?.customer_id) {
      const { data: payments } = await supabase.from('payments').select('*').eq('customer_id', invoice.customer_id);
      return payments || [];
    }

    return [];
  }

  /**
   * Get Promises for Invoice
   */
  static async getInvoicePromises(invoiceIdOrNumber: string) {
    const supabase = getSupabaseClient();
    const invoiceId = await DatabaseService.resolveRealInvoiceId(invoiceIdOrNumber);
    const { data, error } = await supabase.from('promises').select('*').eq('invoice_id', invoiceId);
    if (error) return [];
    return data || [];
  }

  /**
   * Get Communications for Invoice / Customer
   */
  static async getInvoiceCommunications(invoiceIdOrNumber: string) {
    const supabase = getSupabaseClient();
    const invoiceId = await DatabaseService.resolveRealInvoiceId(invoiceIdOrNumber);

    const { data: directComms, error: directError } = await supabase
      .from('communications')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (!directError && directComms && directComms.length > 0) {
      return directComms;
    }

    const { data: invoice } = await supabase.from('invoices').select('customer_id').eq('id', invoiceId).single();
    if (invoice?.customer_id) {
      const { data: customerComms } = await supabase
        .from('communications')
        .select('*')
        .eq('customer_id', invoice.customer_id)
        .order('timestamp', { ascending: false });
      return customerComms || [];
    }

    return [];
  }

  /**
   * Get Reconciliation Exceptions for Invoice
   */
  static async getInvoiceExceptions(invoiceIdOrNumber: string) {
    const supabase = getSupabaseClient();
    const invoiceId = await DatabaseService.resolveRealInvoiceId(invoiceIdOrNumber);
    const { data, error } = await supabase
      .from('reconciliation_exceptions')
      .select('*')
      .eq('invoice_id', invoiceId);
    if (error) return [];
    return data || [];
  }
}

