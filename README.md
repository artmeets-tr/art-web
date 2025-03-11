# Art Web - CRM Uygulaması

Bu proje, tıbbi cihaz satışı yapan şirketler için geliştirilmiş bir CRM (Müşteri İlişkileri Yönetimi) web uygulamasıdır. Uygulama, klinik bilgilerini yönetme, teklifler oluşturma, ameliyat ve ziyaret raporları tutma gibi özelliklere sahiptir.

## Başlangıç

Projeyi yerel geliştirme ortamında çalıştırmak için aşağıdaki adımları izleyin.

### Ön Koşullar

- Node.js (v14+)
- npm veya yarn
- Supabase hesabı

### Kurulum

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/sizin-kullanici-adi/art-web.git
   cd art-web
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   # veya
   yarn install
   ```

3. `.env.example` dosyasını kopyalayıp `.env` olarak yeniden adlandırın:
   ```bash
   cp .env.example .env
   ```

4. `.env` dosyasını Supabase proje bilgilerinizle güncelleyin:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-url.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Uygulamayı başlatın:
   ```bash
   npm start
   # veya
   yarn start
   ```

Uygulama http://localhost:3000 adresinde çalışacaktır.

## Rol Tabanlı Erişim

Uygulama dört farklı kullanıcı rolünü destekler:

- **Admin**: Tüm özelliklere tam erişim.
- **Manager**: Takım performansı ve analitik verilerine erişebilir, ancak kullanıcı yönetimi yapamaz.
- **Regional Manager**: Bölgesel takımları yönetir.
- **Field User**: Sahada çalışan kullanıcılar için temel özellikler.

## Teknolojiler

- React.js
- TypeScript
- Material UI
- Supabase (Backend ve Veritabanı)
- React Router

## Proje Yapısı

```
src/
├── components/       # Yeniden kullanılabilir UI bileşenleri
├── lib/              # Harici servis yapılandırmaları
├── pages/            # Sayfa bileşenleri
├── services/         # API ve veri işlemleri
└── types/            # TypeScript tipleri ve arayüzleri
```

## Mevcut Komutlar

Bu proje Create React App ile oluşturulmuştur. Aşağıdaki komutları kullanabilirsiniz:

### `npm start`

Uygulamayı geliştirme modunda çalıştırır.\
[http://localhost:3000](http://localhost:3000) adresinden tarayıcıda görüntüleyebilirsiniz.

### `npm test`

Test çalıştırıcısını etkileşimli izleme modunda başlatır.

### `npm run build`

Uygulamayı üretim için `build` klasörüne derler.\
Derleme işlemi optimize edilmiş ve performanslı bir şekilde yapılır.

## Dağıtım

Bu uygulama, Netlify, Vercel, Firebase Hosting veya GitHub Pages gibi modern web barındırma platformlarına kolayca dağıtılabilir.

Dağıtım hakkında daha fazla bilgi için [Create React App deployment](https://facebook.github.io/create-react-app/docs/deployment) sayfasına göz atabilirsiniz.

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.