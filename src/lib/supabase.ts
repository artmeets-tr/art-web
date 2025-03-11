import { createClient } from '@supabase/supabase-js';

// Supabase bağlantı bilgileri
// NOT: Bu değerler .env dosyasında tanımlanmalıdır!
if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.error('UYARI: Supabase URL veya ANON_KEY env değişkenleri tanımlanmamış!');
  console.error('Lütfen root dizinde .env dosyası oluşturun ve bu değerleri ekleyin:');
  console.error('REACT_APP_SUPABASE_URL=https://your-project-url.supabase.co');
  console.error('REACT_APP_SUPABASE_ANON_KEY=your-anon-key');
}

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 