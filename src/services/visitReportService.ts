import { supabase } from '../lib/supabase';
import { VisitReport } from '../types';
import { handleSupabaseQuery } from './utils/supabaseHelpers';

/**
 * Ziyaret raporu işlemleri için servis
 */
export const visitReportService = {
  /**
   * Tüm ziyaret raporlarını getirir
   * @returns Ziyaret raporu listesi
   */
  async getAll(): Promise<VisitReport[]> {
    try {
      return handleSupabaseQuery(
        supabase
          .from('visit_reports')
          .select(`
            id,
            user_id,
            clinic_id,
            date,
            time,
            subject,
            contact_person,
            notes,
            follow_up_required,
            follow_up_date,
            created_at,
            clinic:clinics (id, name, region_id, region:regions (id, name)),
            user:users (id, name, email)
          `)
          .order('date', { ascending: false }),
        'Ziyaret raporları alınırken hata'
      );
    } catch (error) {
      console.error("Ziyaret raporları alınırken hata:", error);
      throw error;
    }
  },
  
  /**
   * Belirli bir ziyaret raporunu ID'ye göre getirir
   * @param id Ziyaret raporu ID'si
   * @returns Ziyaret raporu
   */
  async getById(id: number): Promise<VisitReport> {
    try {
      return handleSupabaseQuery(
        supabase
          .from('visit_reports')
          .select(`
            id,
            user_id,
            clinic_id,
            date,
            time,
            subject,
            contact_person,
            notes,
            follow_up_required,
            follow_up_date,
            created_at,
            clinic:clinics (id, name, region_id, region:regions (id, name)),
            user:users (id, name, email)
          `)
          .eq('id', id)
          .single(),
        `Ziyaret raporu #${id} alınırken hata`
      );
    } catch (error) {
      console.error(`Ziyaret raporu #${id} alınırken hata:`, error);
      throw error;
    }
  },

  /**
   * Yeni bir ziyaret raporu oluşturur
   * @param report Ziyaret raporu bilgileri
   * @returns Oluşturulan ziyaret raporu
   */
  async create(report: Partial<VisitReport>): Promise<VisitReport> {
    return handleSupabaseQuery(
      supabase
        .from('visit_reports')
        .insert(report)
        .select()
        .single(),
      'Ziyaret raporu oluşturulurken hata'
    );
  },
  
  /**
   * Bir ziyaret raporunu günceller
   * @param id Ziyaret raporu ID'si
   * @param updates Güncellenecek alanlar
   * @returns Güncellenmiş ziyaret raporu
   */
  async update(id: number, updates: Partial<VisitReport>): Promise<VisitReport> {
    return handleSupabaseQuery(
      supabase
        .from('visit_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      'Ziyaret raporu güncellenirken hata'
    );
  }
};