# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Genel bakış

Kuaför randevu SaaS'ı. Birden fazla işletme (abonelik planlı) kendi dükkanlarını, kuaförlerini ve hizmetlerini web panelinden yönetir; müşteriler mobil uygulamadan şehir ve ilçe seçip randevu alır. Ürün kararları ve veri modeli `PROJE_PLANI.md` içinde; kod yazmadan önce oku. Kullanıcıyla Türkçe konuş.

Monorepo: `apps/api` (NestJS), `apps/web` (web paneli: landing, işletme paneli, platform admin) ve `apps/mobile` (Expo, müşteri uygulaması).

## Web paneli (`apps/web`)

- Stack: Vite + React + TypeScript, Bootstrap 5 (`bootstrap`) + Bootstrap Icons, react-router-dom v6, react-i18next (TR varsayılan, EN), **Redux Toolkit + RTK Query** (`@reduxjs/toolkit`, `react-redux`). Tailwind kullanılmıyor. Komutlar `apps/web` içinde: `npm run dev` (http://localhost:5173), `npm run build` (`tsc -b && vite build`, çıktı `dist/`), `npm run lint`.
- Bootstrap JS paketi `src/main.tsx` içinde yüklenir. `main.tsx` uygulamayı `<Provider store>` ile sarar.
- Geliştirmede `/api` istekleri `vite.config.ts` proxy'siyle canlı API'ye gider. Üretimde `.env.production` içindeki `VITE_API_URL` kullanılır.
- **Veri katmanı (RTK):**
  - `src/store/index.ts`: store (`auth` dilimi + RTK Query `api` dilimi).
  - `src/store/apiSlice.ts`: tüm uç noktalar (`createApi`). Her uç nokta ilgili etiketleri (`providesTags`/`invalidatesTags`) taşır. Önbellek bir yıl tutulur (`keepUnusedDataFor`); sayfalar arası gezintide veri store'dan gelir, sunucuya istek gitmez. Sekme yenilenince store sıfırlanır ve veriler yeniden çekilir. Yazma işlemleri yalnızca etkilenen veriyi geçersiz kılar.
  - `src/store/authSlice.ts`: oturum (kullanıcı, yükleniyor durumu), `restoreSession`, `login`, `logout`, `endSession`, `refreshUser` thunk'ları. Giriş, çıkış ve oturum sonlandırmada `apiSlice.util.resetApiState()` çağrılır; önceki kullanıcının önbelleği yeni oturuma taşınmaz.
  - `src/store/baseQuery.ts`: RTK Query taban sorgusu, mevcut API istemcisini kullanır. `errorText(e, fallback)` ile hata metni alınır.
  - `src/store/hooks.ts`: tipli `useAppDispatch`, `useAppSelector`.
  - Sayfalarda veri çekmek için `useXQuery`, yazma için `useXMutation` kullan. Doğrudan `api()` çağrısı yazma yapma (yalnızca `store/` içinde).
- `src/api/client.ts`: fetch sarmalayıcı. Access token yalnızca bellekte; refresh token `localStorage` (`rt`) içinde. 401'de yenileme yapılır; yenileme **tekilleştirilmiştir** (`refreshing` promise), aksi halde sunucu kullanıcının tüm oturumlarını iptal eder. Hatalar `ApiError` (`status`, `message`, `code`). `SIFRE_DEGISMELI` kodu gelirse şifre ekranına yönlendirilir; refresh yanıtındaki `sifreDegismeli` bayrağı `isPasswordChangeRequired()` ile okunur.
- `src/auth/AuthContext.tsx`: `AuthProvider` (açılışta oturumu geri yükler, API olaylarını Redux'a iletir) ve `useAuth()` (Redux'tan okur). Roller `PLATFORM_ADMIN | ISLETME_SAHIBI | KUAFOR | MUSTERI`. `MUSTERI` bu panele giremez (`MUSTERI_PANEL`).
- `src/App.tsx` rotaları:
  - Herkese açık: `/` (girişsiz: landing `LandingPage`, girişli: rolüne göre ana sayfa), `/login`, `/kayit` (`?plan=GOLD|SILVER|UCRETSIZ` ile plan ön seçimi; solda görsel ve açıklama, sağda form, `.reg-*` sınıfları), `/kayit-sonuc` (ödeme ve havale bilgisi). Landing ve kayıt aynı üst menü ve alt bilgiyi kullanır (`src/components/PublicChrome.tsx`).
  - Personel (`Layout`): `/sifre-degistir`. `sifreDegismeli` ise `Layout` başka sayfaya geçirmez ve yan menüyü gizler.
  - İşletme sahibi: `/panel`, `/randevular`, `/dukkanlar`, `/kuaforler`, `/kuaforler/:id`, `/kuaforler/:id/calisma`, `/profil`.
  - Kuaför: `/panel`, `/randevular`, `/calisma`, `/profil`.
  - Platform admini: `/admin/isletmeler`, `/admin/isletmeler/:id`, `/admin/odemeler`, `/admin/planlar`, `/admin/ayarlar` (havale), `/admin/denetim`.
- `src/i18n/`: `tr.json` ve `en.json`. Yeni metin eklerken iki dosyaya da ekle. JSON'u script ile yeniden yazma, elle düzenle. Dil tercihi `localStorage` `lang` anahtarında.
- `src/lib/format.ts`: saatler `Europe/Istanbul`. `src/lib/flash.ts`: sayfalar arası tek seferlik mesaj (`sessionStorage`). `src/lib/badges.ts`: işletme durum rozetleri.
- Duyarlı tasarım (telefon, tablet, masaüstü):
  - `src/index.css` `.app-shell`: dar ekranda (992px altı) üst çubuk ve çekmece kenar çubuğu, geniş ekranda sabit kenar çubuğu.
  - Listelerde telefonda kart görünümü (`d-md-none`), tablet ve masaüstünde tablo (`d-none d-md-block`). Açılır menü içeren tabloda `table-responsive` **kullanılmaz** (menüyü kırpar). Denetim sayfası açılır menü içermediği için `table-responsive` kullanır.
  - Bootstrap'te `min-w-0` yoktur; flex içinde metin taşmasını önlemek için `index.css` içinde tanımlı.
- Stil: Bootstrap sınıfları doğrudan JSX'te. Durum rozetleri renk + metin ile gösterilir. Tema `index.css` başındaki `:root` değişkenlerinde (altın `#f2c05d`, koyu lacivert `#15152e`); Bootstrap `primary` bu altına bağlıdır, `.text-bg-primary` ise "Bekliyor" sarısıyla karışmasın diye koyudur. Altın üzerinde yazı koyu olur, beyaz zeminde altın yazı için `--gold-text` kullanılır. Yazı tipleri `@fontsource` ile pakettedir (Roboto, başlıklarda Roboto Condensed). Landing sınıfları `.lp-*`, `.plan-card-*`, `.city-card`, `.rank-badge` `index.css` içinde.
- Landing fotoğrafları `public/images/landing/` altında (Pexels lisansı). Dosya adının sonundaki sayı Pexels fotoğraf numarasıdır. Fotoğraflar temsilidir; platformdaki gerçek kuaförlerin işi gibi sunulmaz.
- Grafik: `src/components/BarChart.tsx` tek seri, tek eksenli CSS çubuk grafik. Kütüphane yok.
- `public/.htaccess`: SPA yönlendirmesi ve HTTP → HTTPS.
- Yayın: `kuafor.trthabercanli.com` (API `api.sozcutvcanli.com` adresinde kalır). `npm run build` çıktısı (`dist/`) cPanel'de bu alan adının klasörüne, gizli `.htaccess` dosyasıyla birlikte yüklenir. Panel origin'i API'nin CORS listesinde tam olarak `https://` ile yer almalı: `CORS_ORIGINS` ortam değişkeni tanımlıysa o, değilse `apps/api/src/main.ts` içindeki varsayılan geçerlidir.
- Bilinen eksikler: müşteri paneli yok (müşteri yalnızca mobilden kullanır). Kayıt ve onay bildirimleri e-posta ile gitmiyor (SMTP yok). Dükkan düzenleme ekranı var; kuaför kendi hizmetlerini düzenleyemez (yalnızca işletme sahibi). Ödeme takibi satırında rozet onay tarihini gösteriyor, ödeme dönemini değil.

## Mobil uygulama (`apps/mobile`)

**Durum:** Yeni API'ye uyarlandı. Randevu akışı şehir/ilçe → dükkan → kuaför → hizmet → saat sırasıyla çalışıyor. Web paneliyle aynı temaya geçirildi, şehir ve ilçe seçimi aramalı açılır liste oldu. Kod derlenip lint'ten geçiyor, Android paketi çıkıyor; ekranlar yalnızca tarayıcı önizlemesinde sahte veriyle görüldü. Bu sürümün APK'sı henüz derlenmedi, cihazda denenmedi. Müşteri girişi önceki sürümde cihazda doğrulandı (test hesabı `musteri1@test.local`, şifre `Test1234!`). Dükkan → randevu akışı cihazda henüz denenmedi.

Expo SDK 58, TypeScript, React Navigation v7 (native-stack + bottom-tabs), i18next (TR varsayılan, EN), `expo-secure-store`, `expo-notifications`, `expo-device`, `expo-constants`, `expo-font`, `expo-splash-screen`, `@expo/vector-icons` (Ionicons). Yalnızca müşteri akışı.

Ekranlar: Giriş/Kayıt; sekmeler: Dükkanlar (aramalı şehir/ilçe seçimi, isteğe bağlı hizmet araması, `ShopsScreen`), Randevularım, Bildirimler (okunmamış sayı rozeti), Profil; üst yığında dükkanın kuaförleri (`ShopStylistsScreen`), kuaför detayı (hizmetler ve değerlendirmeler), Randevu al/değiştir (`Booking`) ve değerlendirme (`Review`). Yalnızca `MUSTERI` hesapları girebilir; diğer roller giriş ekranında reddedilir.

Komutlar (`apps/mobile` içinde, Node 22.13+ gerekli; React Native 0.88 bunu istiyor):
- `npx expo start`. Windows PowerShell'de `npx.cmd expo start` kullan; betik politikası `npx.ps1`'i engelliyor.
- `npm run lint` (`eslint .`). `expo lint` bu ortamda sürüm kontrolünde takılıyor.
- `npx tsc --noEmit`
- `npx expo-doctor`
- Paket eklerken `npx expo install <paket>` (SDK'ya uygun sürüm). Test script'i yok.
- `expo-notifications` için `app.json` içinde `plugins` listesinde olmalı.
- APK üretimi (EAS Build, bulutta derlenir): `npx.cmd eas-cli@latest build -p android --profile preview`. Profil `eas.json` içinde tanımlı (`apk`, `internal`). Proje: `@hakanegne/mobile`, `app.json` içinde `extra.eas.projectId` ve `android.package = com.sozcutvcanli.randevu`. Mobil kodu değişince yeni APK derlenmeli (OTA güncelleme kurulu değil).
- Push için Android'de FCM kimlik bilgisi gerekir (`npx.cmd eas-cli@latest credentials`). Yüklenmeden token alınamaz; bu durumda uygulama sessizce devam eder.

Mimari:
- `src/theme.ts`: renk, boşluk, köşe, gölge ve yazı stillerinin tek kaynağı. Renkler web paneliyle aynı (altın `#F2C05D`, lacivert `#15152E`). Ekranlarda sabit renk veya yazı boyutu yazılmaz. Altın zeminde yazı koyu olur, açık zeminde altın yazı için `goldText` kullanılır.
- `src/components/ui.tsx`: `Txt`, `Button`, `Field`, `Card`, `Avatar`, `Stars`, `EmptyState`, `SectionTitle`, `PhotoHeader`, `PhotoLayer`, `Loading`. `src/components/Select.tsx`: aramalı açılır liste (`Modal` + `FlatList`); arama Türkçe harf ve büyük/küçük farkını yok sayar (`src/lib/text.ts`).
- Başlık fontu `assets/fonts/RobotoCondensed-Bold.ttf`, `App.tsx` içinde `useFonts` ile yüklenir; yüklenene kadar açılış ekranı kalır. Gövde metni sistem fontudur. Fotoğraflar `assets/images/` altında (Pexels lisansı, dosya adındaki sayı fotoğraf numarasıdır). Fotoğraf için `ImageBackground` yerine `PhotoLayer` kullan.
- `src/config.ts`: API adresi (canlı API).
- `src/api/client.ts`: fetch sarmalayıcı. Access token bellekte, refresh token SecureStore'da (`refreshToken`). 401'de tek yenileme yapılır. Giriş ve kayıt istekleri `auth: false` ile gider.
- `src/api/endpoints.ts`: `authApi`, `locationsApi` (şehir, ilçe, ilçedeki dükkanlar), `stylistsApi` (`byShop(shopId)` dahil), `appointmentsApi`, `reviewsApi`, `notificationsApi`, `devicesApi`.
- `src/auth/AuthContext.tsx`: açılışta refresh token ile oturumu geri yükler; giriş, kayıt ve oturum açılışında `registerPush()` çağrılır, çıkıştan önce `unregisterPush()`.
- `src/notifications/push.ts`: Expo push token alma ve sunucuya kaydetme. Fiziksel cihaz, izin ve EAS `projectId` gerekir.
- `src/notifications/unread.tsx`: `UnreadProvider` / `useUnread`. Okunmamış bildirim sayısı; sekme rozeti (`tabBarBadge`).
- `src/navigation/RootNavigator.tsx`: `signedIn` ise Tabs, StylistDetail, Booking, Review; değilse Login, Register. `Booking` parametresinde `appointmentId` varsa değiştirme modunda çalışır.
- Randevu akışı: Dükkanlar (şehir/ilçe) → ShopStylists (kuaför) → StylistDetail (hizmet seçimi) → Booking. Boş saatler `availability` ile sunucudan gelir.
- Değerlendirme: Randevularım'da `TAMAMLANDI` ve puanı olmayan randevuda "Değerlendir" → `ReviewScreen`.
- Bildirimler: `NotificationsScreen`, `/notifications/mine`, liste yüklenince `markAllRead`.
- `src/lib/time.ts`: Europe/Istanbul (sabit UTC+03:00) elle hesaplanır. `canChange()` 2 saat kuralını sunucuyla aynı uygular.
- Ekranlar odaklanınca (`useFocusEffect`) veriyi yeniler. Effect gövdesinde senkron `setState` ESLint'te hata veriyor (`react-hooks/set-state-in-effect`).
- `src/i18n/index.ts`: i18next, dil tercihi SecureStore `lang` anahtarında. Yeni metin `tr.json` ve `en.json`'a birlikte eklenir.
- `apps/mobile/AGENTS.md`: Expo'nun kendi talimatları. Expo API'si kullanılırken SDK sürümünün dokümanına bak.

## API (`apps/api`) komutları

Tüm komutlar `apps/api` klasöründe çalıştırılır.

- `npm install` — bağımlılıkları kurar
- `npm run build` — `nest build`, çıktı `dist/`
- `npm start` — `node dist/main.js` (derleme gerekir)
- `npm run start:dev` — watch modunda çalıştırır

API'de lint ve test script'i yok. Bunlar eklenmeden komut uydurma.

Yerel çalıştırma için `PORT` (varsayılan 3000), `DATABASE_URL` ve `JWT_ACCESS_SECRET` gerekir; `apps/api/.env` içinde tanımlanır. Yerelde veritabanına erişim yok (PostgreSQL cPanel'de); bu yüzden uçtan uca testler sunucuda yapılır. Yerel doğrulama için PGlite (`@electric-sql/pglite`) ile SQL dosyaları çalıştırılabilir.

## Mimari (API)

Global prefix `api/v1`. Varsayılan olarak tüm uç noktalar giriş ister; herkese açık olanlar `@Public()` ile işaretlenir.

- `src/main.ts`: NestFactory, prefix, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), `trust proxy`, `PORT` ile listen.
- `src/database/`: `DatabaseService` tek bir `pg` Pool (max 5). `query(text, params)` ve `transaction(fn)`. ORM yok.
- `src/common/`: `pg-errors.ts` (PostgreSQL kodları), `rate-limit.ts` (`@RateLimit` + `RateLimitGuard`, bellek içi), `ownership.ts` (kuaför/dükkan/işletme sahiplik kontrolleri, `VISIBLE_STYLIST_FROM/WHERE` ile müşteriye görünürlük), `audit.ts` (`AdminIslem` kaydı).
- `src/auth/`:
  - Access token: JWT, 15 dakika, payload `{ sub, role, email }`.
  - Refresh token: 48 byte rastgele, veritabanında SHA-256 hash, 30 gün, her yenilemede döner. İptal edilmiş token tekrar kullanılırsa kullanıcının tüm oturumları kapanır.
  - `JwtAuthGuard` (global): her korumalı istekte hesabı yeniden okur (`account.service.ts`). İşletme AKTIF değilse 403 (`ISLETME_PASIF` / `ISLETME_ONAY_BEKLIYOR`). `sifreDegismeli` ise yalnızca `@AllowPasswordChange()` uç noktaları açık (403 `SIFRE_DEGISMELI`). `RolesGuard` (global) `@Roles(...)` ile rol kısıtlar. Rol token'dan değil veritabanından okunur.
  - Uç noktalar: `POST /auth/register` (müşteri), `POST /auth/isletme-kayit` (işletme sahibi, ONAY_BEKLIYOR; havale bilgisi `Ayar` tablosundan), `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET/PATCH /auth/me`, `POST /auth/change-password` (tüm refresh token'ları iptal eder, `sifreDegismeli` sıfırlanır).
- `src/plans/`: `GET /plans` (herkese açık; limitler ve `aylikUcret`).
- `src/landing/`: `GET /landing` (herkese açık): istatistikler, ilk 10 kuaför, İstanbul/İzmir/Ankara şehir listeleri. Yalnızca en az 3 değerlendirmesi olan, görünür kuaförler; puana göre sıralı. `yorumlar`: görünür kuaförlerin en yeni 6 yorumu (puan en az 4, metin en az 15 karakter, kuaför başına bir yorum, aynı metin bir kez). Müşteri ve kuaför soyadı yalnızca baş harf olarak gider.
- `src/locations/`: `GET /locations/cities`, `GET /locations/cities/:id/districts` (herkese açık; sıralama veritabanına bırakılmaz, serviste Türkçe kurala göre yapılır), `GET /locations/districts/:id/shops?service=` (giriş gerekir; yalnızca AKTIF işletmelerin dükkanları, plan sırasına göre).
- `src/settings/`: `GET /settings/havale` (herkese açık), `PUT /admin/settings/havale` (platform admini; `Ayar` tablosu).
- `src/business/`: işletme sahibi. `GET /business` (özet, plan limitleri), `GET/POST /business/shops`, `PATCH/DELETE /business/shops/:id`. Dükkan limiti plan `maxDukkan` ile, işletme satırı `FOR UPDATE` ile kilitlenerek kontrol edilir.
- `src/stylists/`:
  - İşletme sahibi: `GET/POST /business/stylists` (kuaför ekleme: e-posta ve geçici şifre, `sifreDegismeli=true`; plan `maxKuaforDukkan`), `GET/PATCH/DELETE /business/stylists/:id`, `GET/POST /business/stylists/:id/services` (plan `maxHizmetKuafor`), `PATCH/DELETE /business/services/:id`.
  - Kuaför: `GET/PATCH /stylists/me`.
  - Müşteri (giriş gerekir): `GET /stylists?shopId=`, `GET /stylists/:id`, `GET /stylists/:id/services` (yalnızca görünür kuaförler).
- `src/schedule/`: çalışma saatleri ve izinler. Kuaför: `/stylists/me/working-hours`, `/stylists/me/time-off`. İşletme sahibi: `/business/stylists/:id/working-hours`, `/business/stylists/:id/time-off`. İzin eklerken onaylı veya bekleyen randevu çakışıyorsa 409.
- `src/appointments/`:
  - Müsaitlik: `GET /stylists/:id/availability?date&serviceId` (kuaför, dükkan ve işletme aktif değilse 400).
  - Müşteri: `POST /appointments` (kuaför ve hizmet `FOR UPDATE` ile kilitlenir), `GET /appointments/mine`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/reschedule`. İptal ve değişiklik randevuya 2 saatten az kaldığında yapılamaz.
  - Kuaför: `GET /appointments/stylist`. İşletme sahibi: `GET /appointments/business`.
  - Kuaför ve işletme sahibi: `PATCH /appointments/:id/status`, `DELETE /appointments/:id` (kapsam dışı kayıt 404).
  - Durum geçişleri: `BEKLIYOR → ONAYLANDI | IPTAL`, `ONAYLANDI → TAMAMLANDI | GELMEDI | IPTAL`.
- `src/reviews/`: `POST /appointments/:id/review` (müşteri, tamamlanan randevu, bir kez), `GET /stylists/:id/reviews`, `GET /business/stylists/:id/reviews` (işletme sahibi).
- `src/dashboard/`: `GET /dashboard` (işletme sahibi: işletmenin tüm kuaförleri; kuaför: kendisi).
- `src/admin/`: platform admini (`PLATFORM_ADMIN`):
  - `GET /admin/business`, `GET /admin/business/:id`, `POST /admin/business/:id/approve` (ücretli planda `odemeTarihi` zorunlu; ödeme günü o tarihin günü olur; ilk `Odeme` kaydı oluşur), `PATCH /admin/business/:id/status` (AKTIF/PASIF), `PATCH /admin/business/:id/payment-day`.
  - `GET /admin/payments?date=` (seçilen gün ve ödemesi geçmiş işletmeler), `POST /admin/payments` (ödeme onayı, tekil).
  - `PATCH /admin/plans/:kod` (aylık ücret; limitler sabit), `GET /admin/audit`.
  - Her yönetici işlemi `AdminIslem` tablosuna yazılır (önceki ve yeni değer).
- `src/notifications/`: `POST /devices`, `DELETE /devices/:token`, `GET /notifications/mine`, `GET /notifications/unread-count`, `POST /notifications/read-all`, `POST /internal/reminders/run` (`x-cron-secret` ile; `CRON_SECRET` tanımlı değilse 403). Durum değişimlerinde müşteriye bildirim; Expo push ile gönderim.
- `src/scheduling/scheduling.ts`: saat hesapları ve çakışma kontrolü (`validateBooking`, `countActiveOverlapping`, `countUpcomingActive`).

Route sırası önemli: `me` rotaları `:id` rotalarından önce tanımlanmalı.

## Veritabanı

- PostgreSQL 10.23, cPanel'de. Bağlantı yalnızca `DATABASE_URL` ortam değişkeninde; koda, log'a veya sohbete yazılmaz.
- Tablo ve kolon adları tırnaklı camelCase (`"Isletme"`, `"Dukkan"`, `"Stylist"`, `"sahipId"`). Sorgularda bu adları birebir tırnaklı yaz. Kullanıcı rolü kolonu `"rol"`.
- Güncel şema: `db/saas-schema.sql`. Tablolar: `Plan`, `Il`, `Ilce`, `User`, `Isletme`, `Dukkan`, `Stylist`, `Service`, `WorkingHours`, `TimeOff`, `Appointment`, `Review`, `DeviceToken`, `NotificationLog`, `RefreshToken`, `Odeme`, `AdminIslem`, `Ayar`.
- Canlıda 81 il ve 973 ilçe yüklü. `saas-schema.sql` il ve ilçe eklemez; canlıdaki mevcut yedi ilçe eski id'leriyle (1-7) durur.
- Kurulum dosyaları (`apps/api` altında; sırayla, elle, phpPgAdmin SQL penceresinde):
  - `db/saas-reset.sql`: public şemadaki tüm tabloları siler. Geri alınamaz; bir kez.
  - `db/saas-schema.sql`: şema ve `Plan` tohumu.
  - `db/saas-test-data.sql`: test işletmeleri, kuaförler, randevular, ödemeler, havale ayarı (e-postalar `*@test.local`, şifre `Test1234!`).
  - `db/saas-landing-reviews.sql`: landing için test değerlendirmeleri.
  - `db/saas-il-ilce.sql`: Türkiye'nin 81 il ve 973 ilçesi. Yalnızca `Il` ve `Ilce` tablolarına `INSERT` yapar, sayaçlara dokunmaz, tekrar çalıştırılabilir. `Il.id` plaka kodu, yeni ilçelerde `Ilce.id` = plaka * 1000 + sıra. Boş veritabanında `saas-test-data.sql` dosyasından sonra çalıştırılır.
  - `db/saas-bulk-test-data.sql` ve `db/saas-bulk-test-data-city.sql`: toplu test verisi (İstanbul, İzmir, Ankara). Her kayıt `bulk-*@test.local`. İlk dosya dükkanları rastgele ilçeye dağıtır; il/ilçe listesi yüklüyken yeniden çalıştırılırsa test dükkanları Türkiye'nin her yerine yayılır.
  - `db/saas-bulk-test-cleanup.sql`: yalnızca `bulk-*@test.local` kayıtlarını siler.
  - `db/saas-cleanup-keep-admin.sql`: admin, plan, havale ve il/ilçe dışındaki tüm veriyi siler. Geri alınamaz.
- **phpPgAdmin kuralı:** SQL penceresi metni noktalı virgüllere göre böler. `DO $$ ... $$` blokları bu yüzden bozulur (`unterminated dollar-quoted string`). Dosyalarda `DO $$` kullanma; her ifade ayrı ve noktalı virgülle bitsin.
- Plan fiyatları (`Plan.aylikUcret`) admin panelinden girilir; ücretli planlar için fiyat tanımlı olmadan onay yapılamaz. Test verisinde fiyat yoksa `Odeme` insert'i `NOT NULL` nedeniyle hata verir.
- Yetki: uygulama kullanıcısı `sozcpdjd_usradm`. Yeni tablo veya sequence eklendiğinde şu yetki verilmezse `permission denied` hatası alınır:
  `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO sozcpdjd_usradm;`
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sozcpdjd_usradm;`
  (`saas-schema.sql` sonunda bu satırlar var.)
- Eski tek salon şeması ve migration'lar kaldırıldı.

### Prisma kullanılmıyor (neden)

Prisma 5 denendi ve kaldırıldı: paylaşımlı hosting'de `prisma generate` (WebAssembly) bellek sınırında "Out of memory" ile çöküyor. Yeniden Prisma'ya geçmeyi önermeden önce bu kısıtı hatırla.

## Dağıtım (cPanel Node.js App)

- Sunucu: Namecheap paylaşımlı hosting, Node 20.20.2. API alan adı `api.sozcutvcanli.com`, web paneli `kuafor.trthabercanli.com`. Yeni alt alan adında SSL, cPanel SSL/TLS Status ekranından AutoSSL ile alınır. Eski `panel.sozcutvcanli.com` kaldırıldı; `sozcutvcanli.com` alan adı API için gereklidir.
- Uygulama kökü: `randevu-api`. Başlangıç dosyası: `dist/main.js`. Mod: Production.
- Sunucuya yalnızca `dist/` ve `package.json` yüklenir. `src`, `node_modules`, `.env` yüklenmez. Yüklemeden önce sunucudaki `dist/` silinir.
- Bağımlılık değişince cPanel'den **Run NPM Install**, sonra **Restart**.
- Ortam değişkenleri cPanel Node.js App ekranında: `DATABASE_URL`, `JWT_ACCESS_SECRET` (yoksa uygulama başlamaz), `CRON_SECRET` (hatırlatma için), isteğe bağlı `CORS_ORIGINS`. Havale bilgisi ortam değişkeni değil, admin panelinden yönetilir (`Ayar`). Değişiklik sonrası Restart.
- Hatırlatma cron işi (cPanel Cron Jobs, 15 dakikada bir): `curl -X POST -H "x-cron-secret: <CRON_SECRET>" https://api.sozcutvcanli.com/api/v1/internal/reminders/run`. Kurulumu doğrulanmadı.
- Hata ayıklama: `randevu-api/stderr.log`. Veritabanı hataları `code=` ile düşer (`28P01` şifre, `42501`/`permission denied` yetki). Bağlantı adresi log'a yazılmaz.
- cPanel "check availability" hatası kök adreste (`/`) JSON 404 dönerse görülür; asıl kontrol `GET /api/v1/health` → `{"status":"ok","database":"ok"}`.
- Yeni API sürümü yayında değilse yeni uç noktalar 404 döner. Bu, yanlış yüklemenin ya da eski `dist/` kalmasının işaretidir.
- Expo push, `exp.host`'a giden HTTPS çağrısı yapar; paylaşımlı hosting'de dış HTTPS erişimi olmalı.
- Web paneli: `apps/web/dist/` (önce panel klasörü temizlenir, sonra yüklenir).

## Durum ve sonraki adımlar

Tamamlanan:
- SaaS dönüşümü: işletme kaydı ve admin onayı, plan limitleri, dükkan/kuaför/hizmet yönetimi, ödeme takibi, aktif/pasif yönetimi, plan fiyatları, havale ayarı, yönetici denetim kaydı.
- API yeni şemaya uyarlandı ve canlıda doğrulandı (okuma, giriş, kısıtlar). Yazma akışları (kayıt, onay, ödeme, randevu onayı, düzenleme) canlıda test edildi.
- Web paneli Redux Toolkit ile yeniden yazıldı. Önbellek davranışı canlıda doğrulandı.
- Web paneli yeni tasarımla yayında: altın/lacivert tema, fotoğraflı landing (slider, galeri, müşteri yorumları, istatistik, ilk 10, şehir listeleri, planlar), solda görsel sağda form düzeninde kayıt sayfası.
- Panel `kuafor.trthabercanli.com` adresine taşındı; SSL ve CORS canlıda doğrulandı, eski `panel.sozcutvcanli.com` kaldırıldı.
- 81 il ve 973 ilçe canlı veritabanına yüklendi; API canlıda Türkçe sıralı döndürüyor.
- Veritabanında test verisi (İstanbul, İzmir, Ankara) yüklü. Test hesapları `@test.local`, şifre `Test1234!`: `admin@test.local`, `owner.gold@test.local`, `stylist.gold1@test.local`, `musteri1@test.local` (yalnızca mobil).

Açık kalanlar:
- **Mobil uygulama:** yeni tasarım kodda hazır, bu sürümün APK'sı derlenmedi (`eas build`). Cihazda klavye ile açılır liste, açılış ekranı ve dükkan → randevu akışı denenmeli.
- **Yeni kayıt ve yönetici girişi:** yeni kayıt sayfasından kayıt gönderimi ve yeni adreste panel girişi denenmeli.
- **Landing yorumları:** yorumlar onaysız yayınlanıyor; admin için yorum gizleme yok. Metin "son yorumlar" diyor ama 4 puan altı yorumlar elendiği için tanıtım amaçlı bir seçki.
- **Platform admin hesabı:** üretim için gerçek bir admin hesabı açılacak (şu an test admini `admin@test.local`).
- **Test verisi temizliği:** canlıdaki test ve QA kayıtları (`bulk-*`, `qa.*`, `test.*`) `saas-bulk-test-cleanup.sql` ve ek bir QA temizliğiyle kaldırılabilir. Gerçek kullanıma geçmeden önce yapılmalı.
- **Ödeme takibi rozeti:** satır, ödeme dönemi yerine onay tarihini gösteriyor. Düzeltilecek.
- **Landing istatistikleri:** test verisi açıkken sayılar test verisini de içerir.
- **Push (cihaz banner'ı):** Android'de FCM kimlik bilgisi EAS'a yüklenmeli.
- **Hatırlatma cron işi:** kurulumu doğrulanmadı.
- **E-posta (kayıt, onay, şifre sıfırlama):** SMTP bilgisi bekliyor.
- **Güvenlik:** `npm install` uyarıları (API 22, mobil 12) incelenmedi.
- **KVKK:** aydınlatma metni (landing'de ad ve soyad baş harfiyle gösterilen yorumlar dahil), hesap silme.
- Yeni tasarım, alan adı taşıma, yorumlar ve il/ilçe çalışmaları commit edilmedi (son commit `9e164a5`). Canlıda yüklü olan web ve API sürümleri de bu commit'lenmemiş koddan derlendi.
