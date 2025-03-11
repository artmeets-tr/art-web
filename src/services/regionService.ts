import { supabase } from '../lib/supabase';
import { Region } from '../types';
import { handleSupabaseQuery } from './utils/supabaseHelpers';

/**
 * Bölge işlemleri için servis
 */
export const regionService = {
  /**
   * Tüm bölgeleri getirir
   * @returns Bölge listesi
   */
  async getAll(): Promise<Region[]> {
    return handleSupabaseQuery(
      supabase
        .from('regions')
        .select('*')
        .order('name'),
      'Bölgeler alınırken hata'
    );
  }
};