/**
 * Form alanı doğrulama helpers
 */

/**
 * Zorunlu alan kontrolü
 * @param value Kontrol edilecek değer
 * @returns Hata mesajı veya boş string
 */
export const validateRequired = (value: any): string => {
  if (value === undefined || value === null || value === '') {
    return 'Bu alan zorunludur';
  }
  if (typeof value === 'string' && value.trim() === '') {
    return 'Bu alan zorunludur';
  }
  return '';
};

/**
 * E-posta formatı kontrolü
 * @param value Kontrol edilecek e-posta
 * @returns Hata mesajı veya boş string
 */
export const validateEmail = (value: string): string => {
  if (!value) return '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Geçerli bir e-posta adresi giriniz';
  }
  return '';
};

/**
 * Minimum uzunluk kontrolü
 * @param value Kontrol edilecek metin
 * @param length Minimum uzunluk
 * @returns Hata mesajı veya boş string
 */
export const validateMinLength = (value: string, length: number): string => {
  if (!value) return '';

  if (value.length < length) {
    return `En az ${length} karakter giriniz`;
  }
  return '';
};

/**
 * Sayısal değer kontrolü
 * @param value Kontrol edilecek değer
 * @returns Hata mesajı veya boş string
 */
export const validateNumber = (value: any): string => {
  if (!value && value !== 0) return '';

  if (isNaN(Number(value))) {
    return 'Sayısal bir değer giriniz';
  }
  return '';
};

/**
 * Pozitif sayı kontrolü
 * @param value Kontrol edilecek değer
 * @returns Hata mesajı veya boş string
 */
export const validatePositiveNumber = (value: any): string => {
  if (!value && value !== 0) return '';

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return 'Sayısal bir değer giriniz';
  }
  if (numValue <= 0) {
    return 'Pozitif bir değer giriniz';
  }
  return '';
};