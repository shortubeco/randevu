# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Genel bakış

Kuaför randevu sistemi. Mobil (müşteri), web paneli (admin/kuaför) ve API. Ürün kararları ve veri modeli `PROJE_PLANI.md` içinde; kod yazmadan önce oku. Kullanıcıyla Türkçe konuş.

Monorepo: `apps/api` (NestJS) ve `apps/web` (web paneli) var. `apps/mobile` (Expo) henüz yok.

## Web paneli (`apps/web`)

- Stack: Vite + React + TypeScript, Bootstrap 5 (`bootstrap`) + Bootstrap Icons (`bootstrap-icons`), react-router-dom v6, react-i18next (TR varsayılan, EN). Tailwind kaldırıldı; iki CSS çatısı birlikte kullanılmaz. Komutlar `apps/web` içinde: `npm run dev` (http://localhost:5173), `npm run build` (`tsc -b && vite build`, çıktı `dist/`).
- Geliştirmede `/api` istekleri `vite.config.ts` proxy'siyle canlı API'ye gider (`https://api.sozcutvcanli.com`). Üretimde `.env.production` içindeki `VITE_API_URL` (`https://api.sozcutvcanli.com/api/v1`) kullanılır.
- `src/api/client.ts`: fetch sarmalayıcı. Access token yalnızca bellekte; refresh token `localStorage` (`rt`) içinde. 401'de bir kez yeniler.
- `src/auth/AuthContext.tsx`: sayfa yenilenince refresh ile oturumu geri yükler. Rol: `ADMIN | KUAFOR | MUSTERI`.
- `src/App.tsx`: rotalar. `/` (dashboard) ve `/randevular` (ADMIN ve KUAFOR); `/kuaforler`, `/kuaforler/:id`, `/hizmetler`, `/hizmetler/:id`, `/musteriler`, `/raporlar` (ADMIN); `/calisma` (KUAFOR); `/profil` (ADMIN ve KUAFOR). MUSTERI erişemez.
- `src/i18n/`: `tr.json` ve `en.json`. Yeni metin eklerken iki dosyaya da ekle. Dil tercihi `localStorage` `lang` anahtarında.
- `src/lib/format.ts`: saatler `Europe/Istanbul` ile gösterilir.
- Stil: Bootstrap sınıfları doğrudan JSX'te (`card`, `table`, `btn btn-*`, `form-control`, `badge text-bg-*`). `src/index.css` yalnızca küçük uyarlamaları içerir (kenar çubuğu, KPI kartları, `.bar-chart` çubuk grafik). Durum rozetleri renk + metin ile gösterilir.
- Grafik: `src/components/BarChart.tsx` tek seri, tek eksenli CSS çubuk grafik. Kütüphane yok.
- `public/.htaccess`: SPA yönlendirmesi (Apache/LiteSpeed).
- Yayın: `panel.sozcutvcanli.com` (HTTPS). Dosyalar `npm run build` çıktısıyla cPanel'de alt alan adı klasörüne yüklenir. Panel origin'i API'nin `CORS_ORIGINS` listesinde tam olarak `https://` ile yer almalı; `http://` ile açılırsa CORS hatası verir.
- Sayfalar:
  - `DashboardPage` (`/`): KPI kartları, 12 aylık randevu ve ciro grafikleri (`BarChart`), bu ayın durumları, bugünün randevuları. ADMIN'de ek olarak kuaför ve hizmet tabloları ile son müşteriler; KUAFOR yalnızca kendi verisini görür.
  - `AppointmentsPage` (`/randevular`): tarih ve durum filtresi, duruma göre işlemler (onayla, iptal, tamamla, gelmedi), silme.
  - `StylistsPage` / `StylistEditPage`: kuaför listesi, hizmet atama, pasife alma, silme; düzenleme sayfasında kişisel bilgiler, slot süresi, aktiflik ve isteğe bağlı yeni şifre (boşsa değişmez).
  - `ServicesPage` / `ServiceEditPage`: hizmet ekleme, aktiflik, silme; düzenleme sayfası.
  - `CustomersPage` (`/musteriler`): arama kutulu müşteri listesi.
  - `ReportsPage` (`/raporlar`): tarih aralığı, duruma göre dağılım, kuaför bazlı ciro.
  - `SchedulePage` (`/calisma`): gün başına birden fazla çalışma aralığı ve mola; izin günleri.
  - `ProfilePage` (`/profil`): kişisel bilgiler, şifre değiştirme; KUAFOR'a ek olarak kuaför bilgisi.
- Şifre değişince sunucu tüm refresh token'ları iptal eder; panel oturumu kapatır ve yeniden girişi ister.
- `public/.htaccess` HTTP'yi HTTPS'e yönlendirir.
- Bilinen eksikler: müşteri paneli yok (müşteri yalnızca mobilden kullanır), raporlar yalnızca tarih aralığı + durum/kuaför bazlı.

## API (`apps/api`) komutları

Tüm komutlar `apps/api` klasöründe çalıştırılır.

- `npm install` — bağımlılıkları kurar
- `npm run build` — `nest build`, çıktı `dist/`
- `npm start` — `node dist/main.js` (derleme gerekir)
- `npm run start:dev` — watch modunda çalıştırır

Lint ve test script'i henüz yok. Bunlar eklenmeden komut uydurma.

Yerel çalıştırma için `PORT` (varsayılan 3000), `DATABASE_URL` ve `JWT_ACCESS_SECRET` gerekir; `apps/api/.env` içinde tanımlanır (şablon `.env.example`, `.env` git'e girmez). PowerShell'de ortam değişkeni `$env:PORT = "3000"` ile verilir, `set` çalışmaz. Yerelde veritabanına erişim yok (PostgreSQL cPanel'de), bu yüzden uçtan uca testler sunucuda yapılır.

## Mimari (API)

Global prefix `api/v1`. Varsayılan olarak tüm uç noktalar giriş ister; herkese açık olanlar `@Public()` ile işaretlenir.

- `src/main.ts`: NestFactory, prefix, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), `PORT` ile listen.
- `src/database/`: `DatabaseService` tek bir `pg` Pool (max 5). `query(text, params)` ve `transaction(fn)` sağlar. ORM yok.
- `src/common/pg-errors.ts`: PostgreSQL hata kodları (`UNIQUE_VIOLATION` = 23505 vb.).
- `src/auth/`:
  - Access token: JWT, 15 dakika, `JWT_ACCESS_SECRET` ile imzalanır, payload `{ sub, role, email }`.
  - Refresh token: rastgele 48 byte, veritabanında yalnızca SHA-256 hash'i (`RefreshToken`), 30 gün. Her yenilemede döndürülür. İptal edilmiş token tekrar kullanılırsa kullanıcının tüm oturumları kapanır.
  - `JwtAuthGuard` ve `RolesGuard` global (`APP_GUARD`). `@Roles(Role.ADMIN)` ile rol kısıtlanır, `@CurrentUser()` ile token payload'ı alınır.
  - Uç noktalar: `POST /auth/register` (her zaman MUSTERI), `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- `src/profile/`: `PATCH /auth/me` (ad, soyad, telefon), `POST /auth/change-password` (mevcut şifre doğrulanır, tüm refresh token'lar iptal edilir).
- `src/admin/`: `GET /admin/customers` (müşteri listesi, randevu sayısı), `GET /admin/reports?from&to` (duruma göre sayılar, kuaför bazlı ciro; ciro yalnızca TAMAMLANDI).
- `src/dashboard/`: `GET /dashboard` (ADMIN ve KUAFOR). Scope'a göre veri döner: KPI, 12 aylık seri (`monthly`), bu ayın durumları, bugünkü randevular. ADMIN'e ek olarak `kuaforler`, `hizmetler`, `sonMusteriler`. Ay sınırları Istanbul saatine göre hesaplanır.
- `src/services/`: `GET /services` (aktif hizmetler). `/admin/services` (ADMIN): listele, `GET /:id` ile tek kayıt, ekle, güncelle, sil (soft delete).
- `src/stylists/`:
  - `GET /stylists`, `GET /stylists/:id`, `GET /stylists/:id/services`: giriş gerekir, yalnızca aktif kuaförler.
  - `GET /stylists/me`, `PATCH /stylists/me` (KUAFOR).
  - `/admin/stylists` (ADMIN): listele, oluştur (KUAFOR kullanıcısı ve Stylist kaydı tek transaction'da), `GET /:id` ile tek kayıt, `PATCH /:id` (profil alanları, ad/soyad/telefon/e-posta, `isActive`, opsiyonel `password`), sil (soft delete), `PUT /:id/services`.
  - `PATCH` ile `password` gönderilirse şifre hash'lenir ve kuaförün tüm refresh token'ları iptal edilir. Admin bu yolla kuaförün şifresini sıfırlar; yeni şifre kuaföre elle iletilir.
  - Pasifleştirme ve silmede kuaförün refresh token'ları iptal edilir.
- `src/scheduling/scheduling.ts`: saat hesapları ve çakışma kontrolü için ortak fonksiyonlar. Saatler Europe/Istanbul (sabit UTC+03:00, DST yok) olarak yorumlanır. `validateBooking` hem randevu oluşturma hem değiştirmede kullanılır.
- `src/schedule/`:
  - KUAFOR: `GET/PUT /stylists/me/working-hours` (haftalık, `gun` 0=Pazar..6=Cumartesi, `HH:mm`, opsiyonel mola), `GET/POST /stylists/me/time-off`, `DELETE /stylists/me/time-off/:tid`.
  - ADMIN: aynı işlemler `/admin/stylists/:id/...` altında.
- `src/appointments/`:
  - Müsaitlik: `GET /stylists/:id/availability?date=YYYY-MM-DD&serviceId=N` (giriş gerekir). Çalışma saatleri − izinler − aktif randevular, slot aralığı kuaförün `slotDakika` değeri.
  - MUSTERI: `POST /appointments`, `GET /appointments/mine`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/reschedule` (değişiklikte durum tekrar `BEKLIYOR` olur). İptal ve değişiklik randevuya 2 saatten az kaldığında yapılamaz.
  - KUAFOR: `GET /appointments/stylist`, `PATCH /appointments/:id/status`, `DELETE /appointments/:id` (yalnızca kendi randevuları, başkasınınki 404).
  - ADMIN: `GET /admin/appointments?stylistId&status&from&to`, ayrıca yukarıdaki durum ve silme uç noktaları.
  - Durum geçişleri: `BEKLIYOR → ONAYLANDI | IPTAL`, `ONAYLANDI → TAMAMLANDI | GELMEDI | IPTAL`. Diğerleri reddedilir.
  - Çakışma kontrolü: randevu oluşturulurken kuaförün `Stylist` satırı `SELECT ... FOR UPDATE` ile kilitlenir. Aynı kuaför için istekler sıraya girer. Veritabanında exclusion constraint kullanılmıyor (`btree_gist` eklentisi süper kullanıcı istiyor).

Route sırası önemli: `me` rotaları `:id` rotalarından önce tanımlanmalı.

## Veritabanı

- PostgreSQL 10.23, cPanel'de. Bağlantı yalnızca `DATABASE_URL` ortam değişkeninde; koda, log'a veya sohbete yazılmaz.
- `db/schema.sql`: ilk kurulum (Prisma'nın ürettiği SQL). Tablo ve kolon adları tırnaklı camelCase: `"User"`, `"customerId"`. Sorgularda bu adları birebir tırnaklı yaz.
- `db/migrations/` altında numaralı SQL dosyaları, elle uygulanır (migration aracı yok):
  - `002_refresh_tokens.sql`: `RefreshToken` tablosu. Uygulandı.
  - `003_timestamptz.sql`: randevu ve izin zamanlarını `TIMESTAMPTZ` yapar. Uygulandı.
- `db/create-admin.sql`: ilk ADMIN hesabı, kişisel bilgi içerir, `.gitignore`'da.
- `db/run.sql`: kullanıcının SQL'i çalıştırmak için kullandığı dosya. Uzun SQL'ler bu şekilde sorunsuz çalıştı.
- Yetki: uygulama kullanıcısı `sozcpdjd_usradm`. Yeni tablo veya sequence eklendiğinde şu yetki verilmezse `permission denied` hatası alınır:
  `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO sozcpdjd_usradm;`
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sozcpdjd_usradm;`
- SQL çalıştırma: phpPgAdmin'de SQL penceresi (tablo "Seç" ekranı değil).

### Prisma kullanılmıyor (neden)

Prisma 5 denendi ve kaldırıldı: paylaşımlı hosting'de `prisma generate` (WebAssembly) bellek sınırında "Out of memory" ile çöküyor. Yeniden Prisma'ya geçmeyi önermeden önce bu kısıtı hatırla.

## Dağıtım (cPanel Node.js App)

- Sunucu: Namecheap paylaşımlı hosting, Node 20.20.2. Alan adı `api.sozcutvcanli.com`.
- Uygulama kökü: `randevu-api`. Başlangıç dosyası: `dist/main.js`. Mod: Production.
- Sunucuya yalnızca `dist/` ve `package.json` yüklenir. `src`, `node_modules`, `.env` yüklenmez. Yüklemeden önce sunucudaki `dist/` silinir.
- Bağımlılık değişince cPanel'den **Run NPM Install**, sonra **Restart**.
- Ortam değişkenleri cPanel Node.js App ekranındaki "Environment variables" bölümünde: `DATABASE_URL`, `JWT_ACCESS_SECRET`. Değişiklik sonrası Restart gerekir.
- Hata ayıklama: `randevu-api/stderr.log`. Veritabanı hataları `code=` ile düşer (`28P01` şifre, `42501`/`permission denied` yetki). Bağlantı adresi log'a yazılmaz.
- Sunucu tarafında `JWT_ACCESS_SECRET` tanımlı değilse uygulama başlamaz.
- cPanel "check availability" hatası kök adreste (`/`) JSON 404 dönerse görülür; npm install yine tamamlanmış olabilir. Asıl kontrol `GET /api/v1/health` → `{"status":"ok","database":"ok"}`.

## Durum ve sonraki adımlar

Tamamlanan: 1. aşama (kurulum, dağıtım, veritabanı), 2. aşama (auth, roller, hizmet, kuaför yönetimi), 3. aşama (çalışma saatleri, izinler, müsaitlik, randevu oluşturma, durum akışı). Sunucuda uçtan uca doğrulandı: müsaitlik, randevu alma ve kuaförün onaylaması.

Sunucuda doğrulandı: çakışma (aynı saate ikinci randevu → 409), mola saati ve çalışma saati dışı istek (→ 400).

Henüz test edilmedi (kullanıcı backend testlerini şimdilik durdurdu): müşteri iptal/değişiklik, 2 saat kuralı, admin listesi. Bu testler web panel tamamlandıktan sonra, uçtan uca olarak yapılabilir.

Web paneli (`apps/web`) tamamlandı: Bootstrap arayüzü, dashboard, yönetim ve düzenleme sayfaları, profil ve şifre işlemleri. Canlı: `https://panel.sozcutvcanli.com`. Panelin sunucuda uçtan uca testi kullanıcı tarafında yapılır; dashboard ve düzenleme akışları henüz test edilmedi.

Yapılacaklar:
- `register` ve `login` için istek sınırı (rate limit).
- Randevu hatırlatma bildirimleri (Expo Push, plan 6. aşama).
- Mobil uygulama (`apps/mobile`, Expo). Müşterinin asıl ürünü; API uç noktaları (`/auth`, `/stylists`, `/services`, `/appointments`) hazır.
- `npm install` 22 güvenlik uyarısı incelenmedi.
