const fs = require('fs');
const path = require('path');

// Load backend/.env
const envPath = path.join(__dirname, '..', 'backend', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2 && !line.startsWith('#')) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}

const { getSupabaseClient } = require('../backend/dist/lib/supabase.js');

async function runAudit() {
  console.log('=== STARTING LIVE SUPABASE DATABASE AUDIT ===\n');
  const supabase = getSupabaseClient();

  const tables = [
    'businesses',
    'customers',
    'invoices',
    'payments',
    'payment_allocations',
    'promises',
    'communications',
    'reconciliation_exceptions',
    'agent_runs',
    'agent_decisions',
    'actions',
    'policy_decisions',
    'audit_logs'
  ];

  console.log('--- 1. LIVE TABLE COUNTS ---');
  const counts = {};
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error querying count for ${table}:`, error.message);
      counts[table] = 'ERROR';
    } else {
      counts[table] = count;
      console.log(`- ${table}: ${count}`);
    }
  }

  console.log('\n--- 2. SYNTHETIC VS BASELINE BREAKDOWN ---');
  const { data: custData } = await supabase.from('customers').select('id');
  const synthCust = (custData || []).filter(c => c.id.includes('c9000000-')).length;
  console.log(`- Customers: ${counts.customers} Total (${synthCust} Synthetic, ${counts.customers - synthCust} Baseline)`);

  const { data: invData } = await supabase.from('invoices').select('id, invoice_number');
  const synthInv = (invData || []).filter(i => (i.invoice_number || '').startsWith('INV-SYNTH-') || i.id.includes('i9000000-')).length;
  console.log(`- Invoices: ${counts.invoices} Total (${synthInv} Synthetic, ${counts.invoices - synthInv} Baseline)`);

  const { data: payData } = await supabase.from('payments').select('id');
  const synthPay = (payData || []).filter(p => p.id.includes('p9000000-')).length;
  console.log(`- Payments: ${counts.payments} Total (${synthPay} Synthetic, ${counts.payments - synthPay} Baseline)`);

  const { data: allocData } = await supabase.from('payment_allocations').select('id');
  const synthAlloc = (allocData || []).filter(a => a.id.includes('a9000000-')).length;
  console.log(`- Allocations: ${counts.payment_allocations} Total (${synthAlloc} Synthetic, ${counts.payment_allocations - synthAlloc} Baseline)`);

  const { data: promData } = await supabase.from('promises').select('id, status');
  const synthProm = (promData || []).filter(p => p.id.includes('r9000000-')).length;
  console.log(`- Promises: ${counts.promises} Total (${synthProm} Synthetic, ${counts.promises - synthProm} Baseline)`);

  const { data: commData } = await supabase.from('communications').select('id');
  const synthComm = (commData || []).filter(c => c.id.includes('m9000000-')).length;
  console.log(`- Communications: ${counts.communications} Total (${synthComm} Synthetic, ${counts.communications - synthComm} Baseline)`);

  const { data: excData } = await supabase.from('reconciliation_exceptions').select('id, status');
  const synthExc = (excData || []).filter(e => e.id.includes('e9000000-')).length;
  console.log(`- Reconciliation Exceptions: ${counts.reconciliation_exceptions} Total (${synthExc} Synthetic, ${counts.reconciliation_exceptions - synthExc} Baseline)`);

  console.log('\n--- 3. STATUS BREAKDOWNS ---');
  const promStatuses = {};
  (promData || []).forEach(p => promStatuses[p.status] = (promStatuses[p.status] || 0) + 1);
  console.log('Promise Status Vocabulary Distribution:', promStatuses);

  const excStatuses = {};
  (excData || []).forEach(e => excStatuses[e.status] = (excStatuses[e.status] || 0) + 1);
  console.log('Exception Status Vocabulary Distribution:', excStatuses);

  console.log('\n--- 4. RELATIONAL INTEGRITY (ORPHAN CHECKS) ---');
  
  const custIdSet = new Set((custData || []).map(c => c.id));
  const { data: invFull } = await supabase.from('invoices').select('id, customer_id, business_id, amount, paid_amount, status, due_date');
  const orphanInvoicesCount = (invFull || []).filter(i => !custIdSet.has(i.customer_id)).length;
  console.log(`- Orphan Invoices (invalid customer_id): ${orphanInvoicesCount}`);

  const { data: payFull } = await supabase.from('payments').select('id, customer_id, business_id, amount');
  const orphanPaymentsCount = (payFull || []).filter(p => !custIdSet.has(p.customer_id)).length;
  console.log(`- Orphan Payments (invalid customer_id): ${orphanPaymentsCount}`);

  const invIdSet = new Set((invFull || []).map(i => i.id));
  const payIdSet = new Set((payFull || []).map(p => p.id));

  const { data: allocFull } = await supabase.from('payment_allocations').select('id, payment_id, invoice_id, allocated_amount');
  const orphanAllocationsCount = (allocFull || []).filter(a => !payIdSet.has(a.payment_id) || !invIdSet.has(a.invoice_id)).length;
  console.log(`- Orphan Payment Allocations (invalid payment_id or invoice_id): ${orphanAllocationsCount}`);

  const { data: promFull } = await supabase.from('promises').select('id, invoice_id, customer_id');
  const orphanPromisesCount = (promFull || []).filter(p => !invIdSet.has(p.invoice_id) || !custIdSet.has(p.customer_id)).length;
  console.log(`- Orphan Promises (invalid invoice_id or customer_id): ${orphanPromisesCount}`);

  const { data: commFull } = await supabase.from('communications').select('id, customer_id, invoice_id');
  const orphanCommsCount = (commFull || []).filter(c => !custIdSet.has(c.customer_id) || (c.invoice_id && !invIdSet.has(c.invoice_id))).length;
  console.log(`- Orphan Communications (invalid customer_id or invoice_id): ${orphanCommsCount}`);

  const { data: excFull } = await supabase.from('reconciliation_exceptions').select('id, invoice_id, payment_id, expected_amount, received_amount, discrepancy_amount, difference');
  const orphanExcCount = (excFull || []).filter(e => !invIdSet.has(e.invoice_id) || !payIdSet.has(e.payment_id)).length;
  console.log(`- Orphan Reconciliation Exceptions (invalid invoice_id or payment_id): ${orphanExcCount}`);

  console.log('\n--- 5. FINANCIAL CONSISTENCY CHECKS ---');
  const paidGreaterThanAmount = (invFull || []).filter(i => Number(i.paid_amount) > Number(i.amount)).length;
  console.log(`- Invoices with paid_amount > amount: ${paidGreaterThanAmount}`);

  const negativeInvoices = (invFull || []).filter(i => Number(i.amount) < 0 || Number(i.paid_amount) < 0).length;
  console.log(`- Invoices with negative amounts: ${negativeInvoices}`);

  const negativePayments = (payFull || []).filter(p => Number(p.amount) < 0).length;
  console.log(`- Payments with negative amounts: ${negativePayments}`);

  const allocSumMap = {};
  (allocFull || []).forEach(a => {
    allocSumMap[a.invoice_id] = (allocSumMap[a.invoice_id] || 0) + Number(a.allocated_amount);
  });

  let allocationMismatches = 0;
  (invFull || []).forEach(inv => {
    const expectedPaid = Number(inv.paid_amount || 0);
    const actualAllocated = Math.round((allocSumMap[inv.id] || 0) * 100) / 100;
    if (Math.abs(expectedPaid - actualAllocated) > 0.01) {
      allocationMismatches++;
    }
  });
  console.log(`- Invoice paid_amount vs Allocation Sum mismatches: ${allocationMismatches}`);

  let exceptionCalcMismatches = 0;
  (excFull || []).forEach(e => {
    const exp = Number(e.expected_amount || 0);
    const rec = Number(e.received_amount || 0);
    const disc = Number(e.discrepancy_amount ?? e.difference ?? 0);
    const calcDisc = Math.round(Math.abs(exp - rec) * 100) / 100;
    if (Math.abs(disc - calcDisc) > 0.01) {
      exceptionCalcMismatches++;
    }
  });
  console.log(`- Exception discrepancy math mismatches: ${exceptionCalcMismatches}`);

  console.log('\n=== AUDIT COMPLETE ===');
}

runAudit().catch(console.error);
