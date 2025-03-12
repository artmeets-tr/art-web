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
  },

  /**
   * Yeni kullanıcı oluşturur
   * @param email Kullanıcı e-posta adresi
   * @param password Kullanıcı şifresi
   * @param userData Kullanıcı verileri
   * @returns Oluşturulan kullanıcı bilgileri
   */
  async createUser(email: string, password: string, userData: Partial<User>): Promise<User> {
    // Önce Supabase Auth ile kullanıcı hesabı oluştur
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // E-posta doğrulamasını atla
    });
    
    if (authError) {
      console.error('Kullanıcı hesabı oluşturulurken hata:', authError);
      throw new Error(`Kullanıcı hesabı oluşturulurken hata: ${authError.message}`);
    }
    
    if (!authData.user) {
      throw new Error('Kullanıcı hesabı oluşturuldu ancak kullanıcı bilgisi alınamadı');
    }
    
    // Kullanıcı profil bilgilerini güncelle
    try {
      // Bazı önemli alanların varsayılan değerlerini ayarla
      const userDataWithDefaults = {
        ...userData,
        id: authData.user.id,
        email: email,
        status: userData.status || 'active'
      };
      
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert(userDataWithDefaults)
        .select()
        .single();
      
      if (profileError) {
        // Profil oluşturulamazsa, auth kullanıcısını da sil
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Kullanıcı profili oluşturulurken hata: ${profileError.message}`);
      }
      
      return profileData;
    } catch (error) {
      // Hata durumunda auth kullanıcısını sil
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw error;
    }
  },
  
  /**
   * Tüm kullanıcıları getirir
   * @returns Kullanıcı listesi
   */
  async getAllUsers(): Promise<User[]> {
    return handleSupabaseQuery(
      supabase
        .from('users')
        .select('*')
        .order('first_name', { ascending: true }),
      'Kullanıcı listesi alınırken hata'
    );
  }
};