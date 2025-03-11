import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

/**
 * Supabase sorguları için tekrar eden ortak hata işleme mantığını kapsülleyen yardımcı fonksiyon
 * @param promise Supabase sorgu promise'i
 * @param errorMessage Hata durumunda gösterilecek mesaj
 * @returns Promise sonucu
 */
export async function handleSupabaseQuery<T>(
  promise: Promise<{ data: T | null; error: PostgrestError | null }>,
  errorMessage: string
): Promise<T> {
  try {
    const { data, error } = await promise;
    
    if (error) {
      console.error(`${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`${errorMessage}: Veri bulunamadı`);
    }
    
    return data as T;
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw error;
  }
}

/**
 * Kullanıcının verilen roller arasında bir role sahip olup olmadığını kontrol eder
 * @param userId Kullanıcı ID'si
 * @param allowedRoles İzin verilen roller
 * @returns Kullanıcı izinli mi
 */
export async function checkUserHasRole(userId: string, allowedRoles: string[]): Promise<boolean> {
  try {
    if (!userId) return false;
    
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error || !data) return false;
    
    return allowedRoles.includes(data.role);
  } catch (error) {
    console.error('Rol kontrolü sırasında hata:', error);
    return false;
  }
}

/**
 * Kullanıcının bölge ID'sini döndürür
 * @param userId Kullanıcı ID'si
 * @returns Bölge ID'si veya null
 */
export async function getUserRegionId(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('region_id')
      .eq('id', userId)
      .single();
    
    if (error || !data) return null;
    
    return data.region_id;
  } catch (error) {
    console.error('Kullanıcı bölgesi bulunurken hata:', error);
    return null;
  }
}

/**
 * Bölge ID'sine göre bölgedeki tüm kullanıcıların ID'lerini döndürür
 * @param regionId Bölge ID'si
 * @returns Kullanıcı ID'leri dizisi
 */
export async function getUsersInRegion(regionId: number): Promise<string[]> {
  try {
    if (!regionId) return [];
    
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('region_id', regionId);
    
    if (error || !data) return [];
    
    return data.map(user => user.id);
  } catch (error) {
    console.error('Bölge kullanıcıları bulunurken hata:', error);
    return [];
  }
}

/**
 * Kullanıcı oturumunu kontrol eder ve geçerli bir oturum yoksa hata fırlatır
 * @returns Geçerli oturum
 */
export async function checkActiveSession() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
  }
  
  return session;
}