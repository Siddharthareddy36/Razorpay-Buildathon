import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

const TABLES = [
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

async function runAudit() {
  console.log('🔍 Starting Supabase Live Database Introspection Audit...\n');

  if (!isSupabaseConfigured()) {
    console.log('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured or using default placeholders.');
    console.log('Please ensure local .env file contains valid credentials.');
    process.exit(1);
  }

  const supabase = getSupabaseClient();
  const auditResult: Record<string, { count: number | null; columns: string[]; sample: any }> = {};

  for (const table of TABLES) {
    try {
      const { count, error: countErr } = await supabase.from(table).select('*', { count: 'exact', head: true });
      const { data, error: dataErr } = await supabase.from(table).select('*').limit(1);

      if (countErr || dataErr) {
        console.error(`❌ Table '${table}' query error:`, countErr?.message || dataErr?.message);
        auditResult[table] = { count: null, columns: [], sample: null };
      } else {
        const sampleRecord = data && data.length > 0 ? data[0] : null;
        const columns = sampleRecord ? Object.keys(sampleRecord) : [];
        auditResult[table] = {
          count: count,
          columns,
          sample: sampleRecord,
        };
        console.log(`✅ Table '${table}': ${count} rows | Columns: [${columns.join(', ')}]`);
      }
    } catch (err: any) {
      console.error(`❌ Error introspecting table '${table}':`, err.message);
      auditResult[table] = { count: null, columns: [], sample: null };
    }
  }

  // Introspect View: invoice_working_view
  try {
    const { count: viewCount, error: viewCountErr } = await supabase.from('invoice_working_view').select('*', { count: 'exact', head: true });
    const { data: viewData, error: viewDataErr } = await supabase.from('invoice_working_view').select('*').limit(1);

    if (viewCountErr || viewDataErr) {
      console.error(`❌ View 'invoice_working_view' query error:`, viewCountErr?.message || viewDataErr?.message);
    } else {
      const sampleView = viewData && viewData.length > 0 ? viewData[0] : null;
      const columns = sampleView ? Object.keys(sampleView) : [];
      console.log(`\n✅ View 'invoice_working_view': ${viewCount} rows | Columns: [${columns.join(', ')}]`);
      auditResult['invoice_working_view'] = { count: viewCount, columns, sample: sampleView };
    }
  } catch (err: any) {
    console.error(`❌ Error introspecting view 'invoice_working_view':`, err.message);
  }

  console.log('\nAudit complete. Data summary:');
  console.log(JSON.stringify(auditResult, null, 2));
}

runAudit().catch(console.error);
