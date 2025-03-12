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
    console.log('Supabase bağlantısı kontrol ediliyor...');
    console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
    
    const { data, error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      console.error('Supabase bağlantı hatası:', error.message);
      console.error('Hata detayı:', error);
      return false;
    }
    
    console.log('Supabase bağlantısı başarılı. Örnek veri:', data);
    return true;
  } catch (err) {
    console.error('Supabase bağlantı kontrolü sırasında bir hata oluştu:', err);
    return false;
  }
};

export { supabase }; 