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

async function auditTelemetry() {
  console.log('=== READ-ONLY AGENT TELEMETRY AUDIT ===\n');
  const supabase = getSupabaseClient();

  // 1. Exact Row Counts
  const { count: runCount } = await supabase.from('agent_runs').select('*', { count: 'exact', head: true });
  const { count: decCount } = await supabase.from('agent_decisions').select('*', { count: 'exact', head: true });
  const { count: auditCount } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true });

  console.log(`- agent_runs: ${runCount}`);
  console.log(`- agent_decisions: ${decCount}`);
  console.log(`- audit_logs: ${auditCount}`);

  // 2. Fetch all agent_runs
  const { data: runs } = await supabase.from('agent_runs').select('*').order('started_at', { ascending: true });

  // Counts by agent_name / agent_type
  const agentNameCounts = {};
  const triggerTypeCounts = {};
  const timeBuckets = {};

  (runs || []).forEach(r => {
    const name = r.agent_name || r.agent_type || 'UNKNOWN';
    agentNameCounts[name] = (agentNameCounts[name] || 0) + 1;

    const trig = r.triggered_by || r.trigger_type || 'UNKNOWN';
    triggerTypeCounts[trig] = (triggerTypeCounts[trig] || 0) + 1;

    const dtStr = r.started_at ? r.started_at.slice(0, 13) + ':00' : 'NO_TIMESTAMP'; // Group by hour
    timeBuckets[dtStr] = (timeBuckets[dtStr] || 0) + 1;
  });

  console.log('\n--- EXACT COUNTS BY AGENT_NAME / TYPE ---');
  console.log(agentNameCounts);

  console.log('\n--- EXACT COUNTS BY TRIGGER_TYPE / TRIGGERED_BY ---');
  console.log(triggerTypeCounts);

  console.log('\n--- CREATION-TIME DISTRIBUTION (BY HOUR) ---');
  console.log(timeBuckets);

  // 3. Fetch all agent_decisions & audit_logs
  const { data: decisions } = await supabase.from('agent_decisions').select('*');
  const { data: audits } = await supabase.from('audit_logs').select('*');

  // Check relationship between agent_runs & agent_decisions
  const runIdSet = new Set((runs || []).map(r => r.id));
  const decRunIdSet = new Set((decisions || []).map(d => d.agent_run_id));

  // Find agent_runs without an agent_decision
  const runsWithoutDecision = (runs || []).filter(r => !decRunIdSet.has(r.id));
  console.log(`\n--- RUNS WITHOUT DECISIONS (${runsWithoutDecision.length} total) ---`);
  runsWithoutDecision.forEach(r => {
    console.log(`  - Run ID: ${r.id} | Name: ${r.agent_name} | Trigger: ${r.triggered_by} | Started: ${r.started_at}`);
  });

  // Check duplicate executions for the same invoice
  const invExecutionCounts = {};
  (decisions || []).forEach(d => {
    if (d.invoice_id) {
      invExecutionCounts[d.invoice_id] = (invExecutionCounts[d.invoice_id] || 0) + 1;
    }
  });

  const duplicateInvoices = Object.entries(invExecutionCounts).filter(([invId, c]) => c > 1);
  console.log(`\n--- DUPLICATE EXECUTIONS FOR SAME INVOICE ---`);
  console.log(`Invoices executed multiple times: ${duplicateInvoices.length}`);
  duplicateInvoices.slice(0, 10).forEach(([invId, count]) => {
    console.log(`  - Invoice ID ${invId}: ${count} execution records`);
  });

  // Check audit_logs correspondence to agent_decisions
  const auditEntitySet = new Set((audits || []).map(a => a.entity_id));
  const decIdSet = new Set((decisions || []).map(d => d.id));

  let auditMatchingDecisions = 0;
  (audits || []).forEach(a => {
    if (decIdSet.has(a.entity_id)) {
      auditMatchingDecisions++;
    }
  });

  console.log(`\n--- AUDIT LOGS MATCHING DECISIONS ---`);
  console.log(`- Audit logs with entity_id matching agent_decisions.id: ${auditMatchingDecisions} of ${audits.length}`);

  console.log('\n=== AUDIT COMPLETE ===');
}

auditTelemetry().catch(console.error);
