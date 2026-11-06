# Kuaför Randevu Takip Uygulaması – Proje Planı

## Amaç
Öğrencilerin mobil uygulamadan kuaför randevusu oluşturduğu, yöneticilerin (admin ve kuaför) PC'den web paneli ile yönettiği bir sistem.

## Durum (son güncelleme: 2026-11-06)
- Tek salon için API, web paneli ve veritabanı çalışır durumda ve canlıya alınmış.
- Mobil uygulama (`apps/mobile`) henüz başlanmadı. Müşterinin asıl ürünü.
- Backend testlerinin bir kısmı kullanıcı tarafından şimdilik durduruldu (bkz. "Test durumu").

## Alınan Kararlar
- **Stack:** TypeScript her yerde.
  - Mobil: React Native (Expo), henüz yok
  - Web panel: React + Vite + TypeScript, **Bootstrap 5** (`bootstrap`, `bootstrap-icons`), react-router-dom v6, react-i18next (TR varsayılan, EN). Tailwind ve MUI kullanılmıyor.
  - Backend: NestJS + PostgreSQL. **ORM yok**, `pg` Pool ile ham SQL. Prisma denendi ve kaldırıldı: paylaşımlı hosting'de `prisma generate` bellek sınırında çöküyor.
- **Saat modeli:** Kuaföre özel çalışma saatleri, mola ve izin günleri. Slot aralığı kuaförün `slotDakika` değeri. Çift rezervasyon engellenir.
- **Zaman dilimi:** Saatler Europe/Istanbul olarak yorumlanır (sabit UTC+03:00, DST yok). Veritabanında randevu ve izin zamanları `TIMESTAMPTZ`.
- **Müşteri girişi:** E-posta + şifre. Access token JWT (15 dk). Refresh token rastgele 48 byte, veritabanında yalnızca SHA-256 hash'i, 30 gün, her yenilemede döner. Yeniden kullanılan iptal edilmiş token tüm oturumları kapatır.
- **Şifre değişince:** Tüm refresh token'lar iptal edilir. Panel oturumu kapatıp yeniden giriş ister.
- **Şifre sıfırlama:** E-posta ile sıfırlama planlandı, henüz uygulanmadı. Yalnızca admin kuaförün şifresini sıfırlayabiliyor (yeni şifre elle iletiliyor).
- **MVP ek özellikler:**
  - Hizmet seçimi (süre ve fiyat): uygulandı
  - Müşteri iptal/değişiklik (2 saat kuralı): uygulandı, test edilmedi
  - Kuaför izin günleri: uygulandı
  - Push bildirim ve hatırlatma: planlandı
  - Puan/değerlendirme: şemada `Review` tablosu var, endpoint yok

## Roller ve Yetkiler

| Rol | Platform | Yetkiler |
|---|---|---|
| ADMIN | Web panel | Kuaför ekle/düzenle/pasifleştir/sil, hizmet ekle/düzenle/sil, kuaför hizmet ataması. Tüm randevuları listele (kuaför/durum/tarih filtresi), onayla, iptal et, tamamla, gelmedi işaretle, sil. Müşteri listesi, raporlar, dashboard. |
| KUAFOR | Web panel | Yalnızca kendi randevuları: onayla, iptal et, tamamla, sil. Kendi profili ve şifresi. Çalışma saatleri ve izin günleri. Dashboard (yalnızca kendi verisi). |
| MUSTERI | Mobil | Kayıt/giriş, profil güncelleme, randevu oluşturma, randevularını görüntüleme/iptal/değiştirme. Değerlendirme: planlandı. |

Yetki kontrolü backend'de yapılır (`JwtAuthGuard` ve `RolesGuard` global, `@Roles`, sahiplik kontrolü). Başkasının kaynağı 404 döner. İstemci gizlemesine güvenilmez.

## Veri Modeli

Şema: `apps/api/db/schema.sql` (ilk kurulum) ve `apps/api/db/migrations/` (sonraki değişiklikler). Tablo ve kolon adları tırnaklı camelCase.

- **User:** id, ad, soyad, telefon, email, passwordHash, role, isActive, deletedAt
- **Stylist:** userId, bio, fotoğraf, slotDakika, isActive, deletedAt
- **Service:** ad, süreDk, fiyat, aktif, deletedAt
- **StylistService:** hangi kuaför hangi hizmeti verir
- **WorkingHours:** stylistId, gün (0=Pazar..6=Cumartesi), başlangıç, bitiş, mola
- **TimeOff:** stylistId, başlangıç, bitiş, sebep
- **Appointment:** customerId, stylistId, serviceId, başlangıç, bitiş, status (BEKLIYOR / ONAYLANDI / IPTAL / TAMAMLANDI / GELMEDI), iptalEden, not, deletedAt
  - Çakışma engeli: randevu oluşturulurken kuaförün `Stylist` satırı `SELECT ... FOR UPDATE` ile kilitlenir (transaction). Exclusion constraint kullanılmıyor (`btree_gist` süper kullanıcı istiyor).
- **RefreshToken:** migration 002 ile eklendi
- **Review:** appointmentId (benzersiz), puan (1-5), yorum. Tablo var, endpoint yok.
- **DeviceToken:** userId, expoPushToken (benzersiz). Tablo var, endpoint yok.
- **NotificationLog:** tablo var, kullanılmıyor.

## API (REST, `/api/v1`)

Varsayılan olarak tüm uç noktalar giriş ister. Herkese açıklar `@Public()` ile işaretlenir. Route sırası: `me` rotaları `:id` rotalarından önce.

- **Sağlık:** `GET /health` → `{"status":"ok","database":"ok"}` (uygulandı)
- **Auth:** register (her zaman MUSTERI), login, refresh, logout, me (uygulandı). Forgot/reset password: yapılacak.
- **Profil:** `PATCH /auth/me` (ad, soyad, telefon), `POST /auth/change-password` (uygulandı)
- **Hizmetler:** `GET /services` (aktif hizmetler). Admin: `/admin/services` listele, tek kayıt, ekle, güncelle, sil (uygulandı)
- **Kuaförler:**
  - `GET /stylists`, `GET /stylists/:id`, `GET /stylists/:id/services` (uygulandı)
  - `GET/PATCH /stylists/me` (KUAFOR, uygulandı)
  - Admin: `/admin/stylists` listele, oluştur (KUAFOR kullanıcısı ve kuaför kaydı tek transaction), tek kayıt, `PATCH /:id` (isActive, opsiyonel yeni şifre), sil, `PUT /:id/services` (uygulandı)
- **Müsaitlik:** `GET /stylists/:id/availability?date&serviceId` (çalışma saatleri − izinler − aktif randevular, uygulandı)
- **Çalışma saatleri ve izinler:**
  - KUAFOR: `GET/PUT /stylists/me/working-hours`, `GET/POST /stylists/me/time-off`, `DELETE /stylists/me/time-off/:tid`
  - Admin: aynısı `/admin/stylists/:id/...` altında
  - Uygulandı
- **Randevular:**
  - MUSTERI: `POST /appointments`, `GET /appointments/mine`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/reschedule` (değişiklikte durum tekrar BEKLIYOR). İptal ve değişiklik randevuya 2 saatten az kala yapılamaz.
  - KUAFOR: `GET /appointments/stylist`, `PATCH /appointments/:id/status`, `DELETE /appointments/:id` (yalnızca kendi randevuları)
  - ADMIN: `GET /admin/appointments?stylistId&status&from&to`, durum ve silme uç noktaları
  - Durum geçişleri: `BEKLIYOR → ONAYLANDI | IPTAL`, `ONAYLANDI → TAMAMLANDI | GELMEDI | IPTAL`. Diğerleri 400.
  - Uygulandı (müşteri iptal/değişiklik ve admin listesi test edilmedi)
- **Müşteriler ve raporlar:**
  - `GET /admin/customers` (müşteri listesi, randevu sayısı, uygulandı)
  - `GET /admin/reports?from&to` (duruma göre sayılar, kuaför bazlı ciro; ciro yalnızca TAMAMLANDI, uygulandı)
- **Dashboard:** `GET /dashboard` (ADMIN ve KUAFOR). KPI, 12 aylık seri, bu ayın durumları, bugünkü randevular. ADMIN'e ek olarak kuaför ve hizmet tabloları, son müşteriler. Ay sınırları Istanbul saatine göre. Uygulandı.
- **Değerlendirme:** planlandı, önerilen yol `POST /appointments/:id/review` (henüz karar verilmedi)
- **Cihaz tokenı:** planlandı, önerilen yol `POST /devices` (Expo Push için, henüz karar verilmedi)

## Mobil Uygulama (Expo) Ekranları (planlandı, başlanmadı)
Giriş/Kayıt → Kuaför listesi → Hizmet seç → Gün/saat seç (boş slotlar) → Ad/soyad/telefon (profilden otomatik dolu) → Onay özeti → Randevularım (yaklaşan/geçmiş, iptal/değiştir) → Profil → Bildirimler → Değerlendirme

## Web Panel Sayfaları (uygulandı)
- **Ortak:** Giriş, Dashboard (`/`), Randevular (`/randevular`: tarih ve durum filtresi, onayla/iptal/tamamla/gelmedi/sil), Profilim (`/profil`: kişisel bilgiler, şifre değiştirme)
- **Admin:** Kuaförler (`/kuaforler`, düzenleme sayfası: bilgiler, slot süresi, aktiflik, isteğe bağlı yeni şifre, hizmet ataması), Hizmetler (`/hizmetler`, düzenleme sayfası), Müşteriler (`/musteriler`, arama kutulu), Raporlar (`/raporlar`)
- **Kuaför:** Çalışma saatleri ve izinler (`/calisma`), dashboard (kendi verisi)
- Dil: Türkçe ve İngilizce. Dil tercihi `localStorage` `lang` anahtarında.
- Saatler `Europe/Istanbul` ile gösterilir.
- Grafik: tek seri, tek eksenli CSS çubuk grafik (`BarChart`), kütüphane yok.
- Bilinen eksikler: müşteri paneli yok (müşteri yalnızca mobilden kullanır). Raporlar yalnızca tarih aralığı ve durum/kuaför bazlı.

## Öneriler (henüz onaylanmadı)
- Randevu onay modu: kuaför onayı uygulandı. Otomatik onay seçeneği ayarlanabilir hale getirilebilir.
- No-show sayacı ve tekrarlarda kısıtlama (2 saat kuralı uygulandı, sayaç yok).
- Öğrenci doğrulaması (öğrenci e-postası veya öğrenci indirimi). İhtiyaç belirsiz.
- KVKK: aydınlatma metni, hesap silme özelliği. Yapılmadı.
- Admin denetim kaydı (audit log): kim neyi sildi/iptal etti. Yapılmadı.
- Gelecek sürüm: SMS (NetGSM vb.), ödeme/kapora, iOS + Android yayını, çoklu şube.

## Aşamalar

1. **[x] Kurulum:** monorepo (`apps/api`, `apps/web`), veritabanı şeması, cPanel dağıtımı. `apps/mobile` ve `packages/shared` henüz yok. CI ve lint eklenmedi (API'de lint ve test script'i yok).
2. **[x] Backend çekirdeği:** auth, roller, kuaför ve hizmet CRUD. Refresh token rotasyonu uygulandı.
3. **[x] Müsaitlik + randevu:** oluşturma, çakışma kontrolü, durum akışı. Müşteri iptal/değişiklik ve 2 saat kuralı kodda var, test edilmedi.
4. **[x] Web panel:** admin ve kuaför akışları, dashboard, düzenleme sayfaları, profil. Canlı: `panel.sozcutvcanli.com`. Dashboard ve düzenleme akışlarının sunucuda testi yapılmadı.
5. **[ ] Mobil uygulama:** müşteri akışı (`apps/mobile`, Expo). Başlanmadı. API uç noktaları hazır.
6. **[ ] Bildirimler ve değerlendirme:** Expo Push, zamanlanmış hatırlatma job'ı, `POST /devices`, değerlendirme endpoint'i ve `Review` kullanımı. Başlanmadı.
7. **[~] Test, güvenlik, deploy:**
   - Deploy: API ve web, Namecheap paylaşımlı hosting (cPanel Node.js App ve statik dosya). Yapıldı.
   - Yapılacak: rate limit (`register`, `login`), `npm install` ile gelen 22 güvenlik uyarısının incelenmesi, uçtan uca testler, KVKK maddeleri, EAS build (mobil) için hazırlık.

## Test durumu
- Sunucuda doğrulandı: müsaitlik, randevu alma, kuaförün onaylaması, çakışma (409), mola ve çalışma saati dışı istek (400).
- Test edilmedi: müşteri iptal/değişiklik, 2 saat kuralı, admin randevu listesi, panelin dashboard ve düzenleme akışları. Bu testler kullanıcı tarafından sunucuda yapılacak.
- Yük testi (eşzamanlı aynı slot isteği) yapılmadı.

## Yapılacaklar (öncelik sırasıyla)
1. Müşteri iptal/değişiklik ve 2 saat kuralının sunucuda testi
2. `register` ve `login` için rate limit
3. Şifre sıfırlama (e-posta) kararı ve uygulaması
4. Mobil uygulama (`apps/mobile`, Expo)
5. Push bildirim, hatırlatma job'ı, değerlendirme endpoint'i
6. `npm install` güvenlik uyarılarının incelenmesi
7. KVKK: aydınlatma metni, hesap silme. Admin denetim kaydı.

## Doğrulama
- Backend testleri (henüz yazılmadı, test script'i yok). Hedef:
  - Çakışma kontrolü
  - Kuaför başkasının randevusuna erişemez
  - Müşteri yalnızca kendi randevusunu görür
- Eşzamanlı iki isteğin aynı slotu alamadığını doğrulayan yük testi
- Uçtan uca: mobilde randevu oluştur → panelde kuaför onaylar → müşteride durum güncellenir
- Rol bazlı manuel senaryolar (admin / kuaför / müşteri)

## Netleşen Kararlar
- **Şube:** Tek salon. Şube modeli yok.
- **Onay:** Kuaför onaylar. Randevu BEKLIYOR durumuna düşer; kuaför veya admin onaylar ya da reddeder.
- **Ödeme:** Yalnızca bilgi. Fiyat gösterilir, ödeme uygulama dışında alınır. Ödeme entegrasyonu yok.
- **Dil:** Türkçe + İngilizce. Çeviri dosyaları (`tr.json`, `en.json`) ve dil seçimi uygulandı (web). Mobil için henüz yapılmadı.
- **Hosting:** Namecheap paylaşımlı hosting, cPanel. Railway/Render/VPS seçeneği kullanılmıyor.
- **Veritabanı:** PostgreSQL 10.23 (cPanel). Migration'lar elle uygulanır, migration aracı yok.
