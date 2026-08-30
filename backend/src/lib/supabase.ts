import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Supabase URL or Service Role Key is missing in environment variables.');
    }
    supabaseInstance = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(process.env.SUPABASE_URL) &&
    process.env.SUPABASE_URL !== 'https://your-supabase-project.supabase.co' &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_supabase_service_role_key_here'
  );
}
