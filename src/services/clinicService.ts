import { supabase } from '../lib/supabase';
import { Clinic } from '../types';
import { handleSupabaseQuery, checkActiveSession } from './utils/supabaseHelpers';
import { userService } from './userService';

/**
 * Klinik işlemleri için servis
 */
export const clinicService = {
  /**
   * Tüm klinikleri getirir, kullanıcı rolüne göre filtreleme yapar
   * @returns Klinik listesi
   */
  async getAll(): Promise<Clinic[]> {
    try {
      // Önce mevcut kullanıcıyı al
      const currentUser = await userService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Kullanıcı bilgisi bulunamadı');
      }
      
      let query = supabase
        .from('clinics')
        .select('*, regions(*)');
      
      // Saha kullanıcısı veya bölge müdürü ise sadece kendi bölgesindeki klinikleri göster
      if (currentUser.role === 'field_user' || currentUser.role === 'regional_manager') {
        if (currentUser.region_id) {
          query = query.eq('region_id', currentUser.region_id);
        }
      }
      
      return handleSupabaseQuery(
        query.order('name'),
        'Klinikler alınırken hata'
      );
    } catch (error) {
      console.error('Klinikler alınırken hata:', error);
      throw error;
    }
  },
  
  /**
   * Belirli bir kliniği ID'ye göre getirir
   * @param id Klinik ID'si
   * @returns Klinik bilgileri
   */
  async getById(id: number): Promise<Clinic> {
    return handleSupabaseQuery(
      supabase
        .from('clinics')
        .select('*, regions(*)')
        .eq('id', id)
        .single(),
      'Klinik bilgileri alınırken hata'
    );
  },
  
  /**
   * Yeni bir klinik oluşturur
   * @param clinic Klinik bilgileri
   * @returns Oluşturulan klinik
   */
  async create(clinic: Partial<Clinic>): Promise<Clinic> {
    // Kullanıcının kimlik bilgilerini kontrol et
    const session = await checkActiveSession();
    
    // Klinik verilerine oturum sahibini ekle
    const clinicData = {
      ...clinic,
      created_by: clinic.created_by || session.user.id
    };
    
    return handleSupabaseQuery(
      supabase
        .from('clinics')
        .insert(clinicData)
        .select()
        .single(),
      'Klinik oluşturulurken hata'
    );
  },
  
  /**
   * Bir kliniği günceller
   * @param id Klinik ID'si
   * @param updates Güncellenecek alanlar
   * @returns Güncellenmiş klinik
   */
  async update(id: number, updates: Partial<Clinic>): Promise<Clinic> {
    // Kullanıcının kimlik bilgilerini kontrol et
    await checkActiveSession();
    
    return handleSupabaseQuery(
      supabase
        .from('clinics')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      'Klinik güncellenirken hata'
    );
  },
  
  /**
   * Klinik durumunu değiştirir
   * @param id Klinik ID'si
   * @param newStatus Yeni durum
   */
  async toggleStatus(id: number, newStatus: 'active' | 'inactive'): Promise<void> {
    const { error } = await supabase
      .from('clinics')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  }
};