import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { handleSupabaseQuery } from './utils/supabaseHelpers';

/**
 * Ürün işlemleri için servis
 */
export const productService = {
  /**
   * Tüm ürünleri getirir
   * @returns Ürün listesi
   */
  async getAll(): Promise<Product[]> {
    return handleSupabaseQuery(
      supabase
        .from('products')
        .select('*')
        .order('name'),
      'Ürünler alınırken hata'
    );
  },
  
  /**
   * Belirli bir ürünü ID'ye göre getirir
   * @param id Ürün ID'si
   * @returns Ürün bilgileri
   */
  async getById(id: number): Promise<Product> {
    return handleSupabaseQuery(
      supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single(),
      'Ürün bilgileri alınırken hata'
    );
  }
};