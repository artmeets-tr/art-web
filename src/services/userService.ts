import { supabase } from '../lib/supabase';
import { User } from '../types';
import { handleSupabaseQuery } from './utils/supabaseHelpers';

/**
 * Kullanıcı işlemleri için servis
 */
export const userService = {
  /**
   * Kullanıcı girişi yapar
   * @param email Kullanıcı e-posta adresi
   * @param password Kullanıcı şifresi
   * @returns Giriş sonuçları
   */
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw new Error(error.message);
    return data;
  },
  
  /**
   * Kullanıcı çıkışı yapar
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },
  
  /**
   * Mevcut oturumdaki kullanıcı bilgilerini getirir
   * @returns Kullanıcı bilgisi
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    try {
      return await handleSupabaseQuery(
        supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single(),
        'Kullanıcı bilgileri alınırken hata'
      );
    } catch (error) {
      console.error('Kullanıcı bilgileri alınırken hata:', error);
      return null;
    }
  },
  
  /**
   * Belirli bir kullanıcının profil bilgilerini getirir
   * @param userId Kullanıcı ID'si
   * @returns Kullanıcı profil bilgileri
   */
  async getProfile(userId: string): Promise<User> {
    return handleSupabaseQuery(
      supabase
        .from('users')
        .select('*, regions(*)')
        .eq('id', userId)
        .single(),
      'Kullanıcı profili alınırken hata'
    );
  },
  
  /**
   * Kullanıcı profilini günceller
   * @param userId Kullanıcı ID'si
   * @param updates Güncellenecek alanlar
   * @returns Güncellenmiş kullanıcı bilgileri
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    return handleSupabaseQuery(
      supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single(),
      'Kullanıcı profili güncellenirken hata'
    );
  }
};