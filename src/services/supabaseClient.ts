/**
 * Supabase istemcisi
 * 
 * NOT: Bu dosya artık sadece lib/supabase.ts dosyasını yeniden export ediyor.
 * Tutarlılık için bundan sonra doğrudan import { supabase } from '../lib/supabase' şeklinde import edilmesi önerilir.
 */

import { supabase } from '../lib/supabase';

// Supabase bağlantı durumunu kontrol eden yardımcı fonksiyon
export const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      console.error('Supabase bağlantı hatası:', error.message);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Supabase bağlantı kontrolü sırasında bir hata oluştu:', err);
    return false;
  }
};

export { supabase }; 