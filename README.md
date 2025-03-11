# Art Web CRM - Tıbbi Cihaz Satış Yönetim Sistemi

Art Web CRM, tıbbi cihaz satışı yapan şirketler için özel olarak tasarlanmış kapsamlı bir müşteri ilişkileri yönetim (CRM) web uygulamasıdır. Modern bir arayüz ve rol tabanlı erişim sistemi ile satış ekiplerinin verimliliğini artırmayı hedefler.

![Art Web CRM](https://via.placeholder.com/800x400?text=Art+Web+CRM)

## 🔍 Özellikler

- **Klinik Yönetimi**: Müşteri kliniklerinizin iletişim bilgilerini ve geçmiş işlemlerini takip edin.
- **Teklif Oluşturma**: Profesyonel görünümlü teklifler oluşturun, indirim ve taksit seçenekleri ekleyin.
- **Ameliyat Raporları**: Gerçekleşen ve planlanan ameliyatları takip edin.
- **Ziyaret Raporları**: Klinik ziyaretlerinizi kaydedin ve takip edin.
- **Ürün Kataloğu**: Satışını yaptığınız tüm tıbbi cihaz ürünlerini yönetin.
- **Ekip Performansı**: Satış ekibinizin performansını detaylı raporlarla analiz edin.
- **Rol Tabanlı Erişim**: Farklı kullanıcı rolleri ile güvenli bir erişim sistemi (Admin, Yönetici, Bölge Yöneticisi, Saha Kullanıcısı).
- **Bildirim Sistemi**: Önemli gelişmelerden anında haberdar olun.
- **Responsif Tasarım**: Mobil cihazlarda da sorunsuz çalışan modern arayüz.

## 🛠️ Teknolojiler

- **Frontend**: React, TypeScript, Material UI
- **Backend**: Supabase (PostgreSQL + RESTful API)
- **Kimlik Doğrulama**: Supabase Auth
- **State Yönetimi**: React Hooks
- **Routing**: React Router v7
- **UI Framework**: Material UI v6
- **Grafikler**: Recharts

## 📋 Kurulum Adımları

### Ön Gereksinimler

- Node.js v14+ ve npm/yarn
- Supabase hesabı ([supabase.com](https://supabase.com))

### 1. Projeyi Klonlama

```bash
git clone https://github.com/artmeets-tr/art-web.git
cd art-web
```

### 2. Bağımlılıkları Yükleme

```bash
npm install
# veya
yarn install
```

### 3. Supabase Kurulumu

1. [Supabase](https://supabase.com) üzerinde yeni bir proje oluşturun
2. Veritabanı şemasını oluşturmak için aşağıdaki adımları izleyin:
   - SQL Editör'e girin
   - `tables.sql` dosyasını indirin: [tables.sql](https://github.com/artmeets-tr/art-web/assets/sql/tables.sql)
   - SQL Editör'de bu dosyayı çalıştırın

### 4. Ortam Değişkenlerini Yapılandırma

`.env.example` dosyasını kopyalayıp `.env` olarak yeniden adlandırın:

```bash
cp .env.example .env
```

Sonra `.env` dosyasını Supabase proje bilgilerinizle güncelleyin:

```
REACT_APP_SUPABASE_URL=https://your-project-url.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_API_BASE_URL=https://api.example.com
REACT_APP_ENVIRONMENT=development
```

### 5. Uygulamayı Çalıştırma

```bash
npm start
# veya
yarn start
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

### 6. İlk Admin Kullanıcı Oluşturma

Yeni oluşturduğunuz Supabase projesinde:

1. Authentication > Users bölümüne gidin
2. "Invite" butonuna tıklayın
3. Email adresinizi ve yeni kullanıcının bilgilerini girin
4. SQL Editör'de aşağıdaki sorguyu çalıştırarak kullanıcı rolünü admin olarak ayarlayın:

```sql
UPDATE auth.users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## 🧩 Özelleştirme Rehberi

### Tema Özelleştirme

`src/App.tsx` dosyasında bulunan `createTheme` fonksiyonunu düzenleyerek şirketinizin kurumsal renklerine uygun bir tema oluşturabilirsiniz:

```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1e3a8a', // Ana renk
      light: '#4e67b0',
      dark: '#0d2b6b',
    },
    secondary: {
      main: '#64748b', // İkincil renk
      light: '#94a3b8',
      dark: '#475569',
    },
    // Diğer renkler...
  },
  // Tipografi, gölgeler vb. özelleştirmeleri...
});
```

### Yeni Özellikler Ekleme

Yeni bir özellik eklemek için yapılması gerekenler:

1. `src/types/index.ts` dosyasında gerekli tip tanımlamalarını oluşturun
2. `src/services/` dizini altında yeni bir servis oluşturun
3. `src/pages/` dizini altında yeni bir sayfa bileşeni oluşturun
4. `src/App.tsx` dosyasında yeni rota tanımlamasını ekleyin

Örnek bir servis dosyası:

```typescript
// src/services/newFeatureService.ts
import { supabase } from '../lib/supabase';
import { NewFeatureType } from '../types';

export const fetchNewFeatures = async () => {
  const { data, error } = await supabase
    .from('new_features')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as NewFeatureType[];
};

// Diğer CRUD operasyonları...
```

### Rol Tabanlı İzinleri Özelleştirme

Kullanıcı rollerini ve izinlerini değiştirmek için:

1. `src/types/index.ts` dosyasında `UserRoleEnum` enum'unu güncelleyin
2. `src/components/RoleBasedRoute.tsx` bileşenini güncelleyerek rol izinlerini ayarlayın
3. Supabase veritabanında ilgili RLS (Row Level Security) politikalarını güncelleyin

## 🚀 Dağıtım

Uygulamayı üretim ortamına dağıtmak için:

```bash
npm run build
# veya
yarn build
```

Oluşturulan `build` klasörünü tercih ettiğiniz bir web barındırma hizmetine (Netlify, Vercel, Firebase Hosting, vb.) yükleyebilirsiniz.

.env dosyasını üretim ortamı için güncelleyin:

```
REACT_APP_SUPABASE_URL=https://your-production-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-production-anon-key
REACT_APP_API_BASE_URL=https://api.your-domain.com
REACT_APP_ENVIRONMENT=production
```

## 📊 Demo Verileri Yükleme

Geliştirme aşamasında test verileriyle çalışmak için:

1. [demo-data.sql](https://github.com/artmeets-tr/art-web/assets/sql/demo-data.sql) dosyasını indirin
2. Supabase SQL Editör'de bu dosyayı çalıştırın

## 🤝 Katkıda Bulunma

Katkılarınızı memnuniyetle karşılıyoruz! Katkıda bulunmak için:

1. Bu repoyu forklayın
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Daha fazla bilgi için [LICENSE](LICENSE) dosyasına bakın.

## 📧 İletişim

Sorularınız veya önerileriniz için: [info@artmeets.com](mailto:info@artmeets.com)

---

Developed with ❤️ by [Art Meets Technology](https://artmeets.com)