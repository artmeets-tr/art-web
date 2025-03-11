import { supabase } from '../lib/supabase';
import { SurgeryReport } from '../types';
import { handleSupabaseQuery } from './utils/supabaseHelpers';

/**
 * Ameliyat raporu işlemleri için servis
 */
export const surgeryReportService = {
  /**
   * Tüm ameliyat raporlarını getirir
   * @returns Ameliyat raporu listesi
   */
  async getAll(): Promise<SurgeryReport[]> {
    try {
      return handleSupabaseQuery(
        supabase
          .from('surgery_reports')
          .select(`
            id,
            user_id,
            clinic_id,
            date,
            time,
            product_id,
            patient_name,
            surgery_type,
            notes,
            status,
            created_at,
            clinic:clinics (id, name, region_id, region:regions (id, name)),
            user:users (id, name, email),
            product:products (id, name, price, category)
          `)
          .order('date', { ascending: false }),
        'Ameliyat raporları alınırken hata'
      );
    } catch (error) {
      console.error("Ameliyat raporları alınırken hata:", error);
      throw error;
    }
  },
  
  /**
   * Belirli bir ameliyat raporunu ID'ye göre getirir
   * @param id Ameliyat raporu ID'si
   * @returns Ameliyat raporu
   */
  async getById(id: number): Promise<SurgeryReport> {
    // ID kontrolü ekle
    if (!id || isNaN(Number(id))) {
      throw new Error('Geçersiz ameliyat raporu ID\'si');
    }
    
    try {
      return handleSupabaseQuery(
        supabase
          .from('surgery_reports')
          .select(`
            id,
            user_id,
            clinic_id,
            date,
            time,
            product_id,
            patient_name,
            surgery_type,
            notes,
            status,
            created_at,
            clinic:clinics (id, name, region_id, region:regions (id, name)),
            user:users (id, name, email),
            product:products (id, name, price, category)
          `)
          .eq('id', id)
          .single(),
        `Ameliyat raporu #${id} alınırken hata`
      );
    } catch (error) {
      console.error(`Ameliyat raporu #${id} alınırken hata:`, error);
      throw error;
    }
  },

  /**
   * Yeni bir ameliyat raporu oluşturur
   * @param report Ameliyat raporu bilgileri
   * @returns Oluşturulan ameliyat raporu
   */
  async create(report: Partial<SurgeryReport>): Promise<SurgeryReport> {
    return handleSupabaseQuery(
      supabase
        .from('surgery_reports')
        .insert(report)
        .select()
        .single(),
      'Ameliyat raporu oluşturulurken hata'
    );
  },
  
  /**
   * Bir ameliyat raporunu günceller
   * @param id Ameliyat raporu ID'si
   * @param updates Güncellenecek alanlar
   * @returns Güncellenmiş ameliyat raporu
   */
  async update(id: number, updates: Partial<SurgeryReport>): Promise<SurgeryReport> {
    return handleSupabaseQuery(
      supabase
        .from('surgery_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      'Ameliyat raporu güncellenirken hata'
    );
  }
};