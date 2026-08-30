import crypto from 'crypto';
import { getSupabaseClient } from '../lib/supabase';

async function check() {
  const supabase = getSupabaseClient();
  
  const { data: runData, error: runErr } = await supabase
    .from('agent_runs')
    .insert({ id: crypto.randomUUID() })
    .select('*');
  
  console.log('INSERT empty agent_runs err:', runErr, 'data:', runData);

  const { data: decData, error: decErr } = await supabase
    .from('agent_decisions')
    .insert({ id: crypto.randomUUID() })
    .select('*');
  
  console.log('INSERT empty agent_decisions err:', decErr, 'data:', decData);

  const { data: auditData, error: auditErr } = await supabase
    .from('audit_logs')
    .insert({ id: crypto.randomUUID() })
    .select('*');
  
  console.log('INSERT empty audit_logs err:', auditErr, 'data:', auditData);
}

check();
