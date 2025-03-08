import { createClient } from '@supabase/supabase-js';

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://afroyzkvyohlfudhxoaj.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmcm95emt2eW9obGZ1ZGh4b2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMDk1ODcsImV4cCI6MjA1NjY4NTU4N30.PXMMD9_9O67cUyM8dBi2EXVQXj53wrGQbpz_WdYzLSw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 