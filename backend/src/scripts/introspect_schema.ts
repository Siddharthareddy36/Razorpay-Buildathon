import { getSupabaseClient } from '../lib/supabase';

async function introspect() {
  const supabase = getSupabaseClient();

  const runId = '00000000-0000-4000-8000-000000000099';
  await supabase.from('agent_runs').insert({
    id: runId,
    business_id: '10000000-0000-4000-8000-000000000001',
    agent_type: 'RECEIVABLES_INTELLIGENCE',
    trigger_type: 'SCHEDULED',
    status: 'COMPLETED',
  });

  const decTest = {
    id: '00000000-0000-4000-8000-000000000099',
    agent_run_id: runId,
    business_id: '10000000-0000-4000-8000-000000000001',
    agent_type: 'RECEIVABLES_INTELLIGENCE',
    decision_type: 'PRIORITY_ASSESSMENT',
    decision: 'CRITICAL',
  };

  const { data: decData, error: decErr } = await supabase.from('agent_decisions').insert(decTest).select('*');
  if (!decErr && decData) {
    console.log('SUCCESS agent_decisions columns:', Object.keys(decData[0]));
    await supabase.from('agent_decisions').delete().eq('id', '00000000-0000-4000-8000-000000000099');
  } else {
    console.log('agent_decisions err:', decErr?.message);
  }

  await supabase.from('agent_runs').delete().eq('id', runId);
}

introspect();
