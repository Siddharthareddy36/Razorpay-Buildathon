import { runReceivablesAgentGraph } from '../agents/receivables/graph';
import { DatabaseService } from '../services/database.service';

async function runMatrix() {
  console.log('==================================================');
  console.log('🧪 RUNNING RECEIVABLES INTELLIGENCE TEST MATRIX');
  console.log('==================================================\n');

  const invoices = await DatabaseService.getInvoices();
  if (invoices.length === 0) {
    console.error('No invoices found in database.');
    return;
  }

  // Select representative invoices from live Supabase data
  const highValueOverdue = invoices.find((i) => i.amount >= 1000000 && i.days_overdue > 20) || invoices[0];
  const severelyOverdue = invoices.find((i) => i.days_overdue > 40) || invoices[1];
  const brokenPromiseInv = invoices.find((i) => i.customer_name?.includes('Sapphire') || i.days_overdue > 50) || invoices[2];
  const partialPaymentInv = invoices.find((i) => i.paid_amount > 0 && i.outstanding_amount > 0) || invoices[3];
  const paidInv = invoices.find((i) => i.status === 'PAID' || i.outstanding_amount === 0) || { ...invoices[4], status: 'PAID', outstanding_amount: 0 };
  const futureDueInv = invoices.find((i) => i.days_overdue === 0) || invoices[5];

  const testCases = [
    { name: 'CASE 1: High-value overdue', invoiceId: highValueOverdue.id },
    { name: 'CASE 2: Severely overdue invoice', invoiceId: severelyOverdue.id },
    { name: 'CASE 3: Repeated broken promises account', invoiceId: brokenPromiseInv.id },
    { name: 'CASE 4: Partial payment invoice', invoiceId: partialPaymentInv.id },
    { name: 'CASE 5: Already-paid invoice (Policy Guardrail)', invoiceId: paidInv.id },
    { name: 'CASE 6: Future-due invoice', invoiceId: futureDueInv.id },
    { name: 'CASE 7: General portfolio invoice 7', invoiceId: invoices[6]?.id || invoices[0].id },
    { name: 'CASE 8: General portfolio invoice 8', invoiceId: invoices[7]?.id || invoices[1].id },
    { name: 'CASE 9: General portfolio invoice 9', invoiceId: invoices[8]?.id || invoices[2].id },
    { name: 'CASE 10: Non-existent invoice (Failure Safety)', invoiceId: '00000000-0000-4000-8000-000000000000' },
  ];

  console.log('| Scenario | Invoice | Outstanding | Days Overdue | Baseline Priority | Agent Priority | Policy Decision | Action |');
  console.log('|:---|:---|:---|:---|:---|:---|:---|:---|');

  for (const tc of testCases) {
    const res = await runReceivablesAgentGraph(tc.invoiceId);
    const amt = `₹${(res.outstandingAmount || 0).toLocaleString('en-IN')}`;
    const days = `${res.daysOverdue || 0}d`;
    const actionTrunc = (res.recommendedAction || 'N/A').slice(0, 35) + '...';
    console.log(`| ${tc.name} | ${res.invoiceNumber || 'NONE'} | ${amt} | ${days} | ${res.baselinePriority || 'N/A'} (${res.baselineScore || 0}) | ${res.agentPriority || 'N/A'} | ${res.policyDecision || 'FAILED'} | ${actionTrunc} |`);
  }

  console.log('\n==================================================');
  console.log('✅ TEST MATRIX EXECUTION COMPLETED');
  console.log('==================================================\n');
}

runMatrix().catch(console.error);
