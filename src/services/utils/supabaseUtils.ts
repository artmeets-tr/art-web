import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import type { PostgrestFilterBuilder, PostgrestBuilder } from '@supabase/postgrest-js';

/**
 * Supabase sorguları için genel hata işleme fonksiyonu
 * Bu fonksiyon, herhangi bir Supabase sorgusu için Promise tipini doğru şekilde dönüştürür
 */
export async function handleSupabaseQuery<T>(
  query: Promise<PostgrestSingleResponse<T>> | PostgrestFilterBuilder<any, any, any> | PostgrestBuilder<any, any>,
  errorMessage: string
): Promise<T> {
  try {
    // PostgrestFilterBuilder veya PostgrestBuilder'ı Promise'e dönüştür
    const response = await Promise.resolve(query);
    const { data, error } = response;

    if (error) {
      console.error(`${errorMessage}:`, error.message);
      throw new Error(`${errorMessage}: ${error.message}`);
    }

    // TypeScript'e data'nın null olmadığını belirtiyoruz
    if (data === null) {
      throw new Error(`${errorMessage}: Veri bulunamadı`);
    }

    // T tipine dönüştürerek döndürüyoruz
    return data as T;
  } catch (err) {
    console.error(`${errorMessage}:`, err);
    throw err;
  }
}

/**
 * Birden çok öğe döndüren Supabase sorguları için yardımcı fonksiyon
 */
export async function handleSupabaseListQuery<T>(
  query: Promise<PostgrestSingleResponse<T[]>> | PostgrestFilterBuilder<any, any, any> | PostgrestBuilder<any, any>,
  errorMessage: string
): Promise<T[]> {
  try {
    const response = await Promise.resolve(query);
    const { data, error } = response;

    if (error) {
      console.error(`${errorMessage}:`, error.message);
      throw new Error(`${errorMessage}: ${error.message}`);
    }

    // Veri yoksa boş dizi döndür
    return (data as T[]) || [];
  } catch (err) {
    console.error(`${errorMessage}:`, err);
    throw err;
  }
}

/**
 * Tek bir öğe döndüren Supabase sorguları için yardımcı fonksiyon
 */
export async function handleSupabaseSingleQuery<T>(
  query: Promise<PostgrestSingleResponse<T>> | PostgrestFilterBuilder<any, any, any> | PostgrestBuilder<any, any>,
  errorMessage: string
): Promise<T | null> {
  try {
    const response = await Promise.resolve(query);
    const { data, error } = response;

    if (error) {
      console.error(`${errorMessage}:`, error.message);
      throw new Error(`${errorMessage}: ${error.message}`);
    }

    return data as T | null;
  } catch (err) {
    console.error(`${errorMessage}:`, err);
    throw err;
  }
} 