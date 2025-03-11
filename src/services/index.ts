// Tüm servisleri tek bir yerden export ediyoruz
// Bu, bileşenlerde import işlemlerini kolaylaştırır

// Kullanıcı servisi
export { userService } from './userService';

// Klinik servisi
export { clinicService } from './clinicService';

// Ürün servisi
export { productService } from './productService';

// Teklif servisi
export { proposalService } from './proposalService';

// Ameliyat raporu servisi
export { surgeryReportService } from './surgeryReportService';

// Ziyaret raporu servisi
export { visitReportService } from './visitReportService';

// Bölge servisi
export { regionService } from './regionService';

// Supabase yardımcı fonksiyonları
export * from './utils/supabaseHelpers';