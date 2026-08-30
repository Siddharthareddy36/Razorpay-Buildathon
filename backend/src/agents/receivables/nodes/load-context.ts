import { DatabaseService } from '../../../services/database.service.js';
import { ReceivablesAgentState } from '../state.js';

export async function loadContextNode(state: ReceivablesAgentState): Promise<Partial<ReceivablesAgentState>> {
  try {
    const invoice = await DatabaseService.getInvoiceById(state.invoiceId);
    if (!invoice) {
      return {
        workflowStatus: 'FAILED',
        error: `Invoice '${state.invoiceId}' not found in ground truth database.`,
      };
    }

    const customerProfile = invoice.customer_id
      ? await DatabaseService.getCustomerById(invoice.customer_id)
      : null;

    const customer = customerProfile?.customer || {};
    const payments = await DatabaseService.getInvoicePayments(state.invoiceId);
    const promises = await DatabaseService.getInvoicePromises(state.invoiceId);
    const communications = await DatabaseService.getInvoiceCommunications(state.invoiceId);
    const exceptions = await DatabaseService.getInvoiceExceptions(state.invoiceId);

    const paidAmt = Number(invoice.paid_amount || 0);
    const invAmt = Number(invoice.amount || 0);
    const outstandingAmt = Math.max(0, invAmt - paidAmt);

    return {
      businessId: invoice.business_id || '',
      customerId: invoice.customer_id || '',
      invoiceNumber: invoice.invoice_number || 'INV-UNKNOWN',
      invoiceAmount: invAmt,
      paidAmount: paidAmt,
      outstandingAmount: outstandingAmt,
      dueDate: invoice.due_date || '',
      daysOverdue: Number(invoice.days_overdue || 0),
      invoiceStatus: invoice.status || 'UNPAID',

      customerName: customer.name || invoice.customer_name || 'Unknown Customer',
      averagePaymentDelay: Number(customer.average_payment_delay_days || 0),
      totalInvoices: Number(customer.total_invoices || 0),
      totalOverdueInvoices: Number(customer.total_overdue_invoices || 0),
      totalPromises: Number(customer.total_promises || 0),
      totalBrokenPromises: Number(customer.total_broken_promises || 0),
      creditLimit: Number(customer.credit_limit || 0),

      paymentCount: payments.length,
      paymentHistory: payments,
      promiseCount: promises.length,
      promiseHistory: promises,
      recentCommunications: communications,
      openExceptionCount: exceptions.length,
      exceptionContext: exceptions,

      workflowStatus: 'PENDING',
    };
  } catch (err: any) {
    return {
      workflowStatus: 'FAILED',
      error: `Failed to load context for invoice ${state.invoiceId}: ${err?.message || err}`,
    };
  }
}
