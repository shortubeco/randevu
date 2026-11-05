# Kuaför Randevu Takip Uygulaması – Proje Planı

## Amaç
Öğrencilerin mobil uygulamadan kuaför randevusu oluşturduğu, yöneticilerin (admin ve kuaför) PC'den web paneli ile yönettiği bir sistem.

Durum: Planlama aşaması tamamlandı. Kod henüz yazılmadı. Repo boş (commit yok).

## Alınan Kararlar
- **Stack:** TypeScript her yerde.
  - Mobil: React Native (Expo)
  - Web panel: React (Vite) + Tailwind veya MUI
  - Backend: NestJS (Node) + PostgreSQL + Prisma
- **Saat modeli:** Kuaföre özel çalışma saatleri ve sabit slotlar. Çift rezervasyon engellenir.
- **Müşteri girişi:** E-posta + şifre. JWT access + refresh token. Şifre sıfırlama e-postayla.
- **MVP ek özellikler:**
  - Hizmet seçimi (süre ve fiyat)
  - Push bildirim ve hatırlatma
  - Müşteri iptal/değişiklik (süre kuralıyla)
  - Kuaför izin günleri ve puan/değerlendirme

## Roller ve Yetkiler

| Rol | Platform | Yetkiler |
|---|---|---|
| ADMIN | Web panel | Kuaför ekle/düzenle/pasifleştir. Tüm randevuları kuaföre göre görüntüle, onayla, iptal et, sil, düzenle. Hizmet kataloğu, müşteri listesi, raporlar. |
| KUAFOR | Web panel | Yalnızca kendi randevuları: onayla, iptal et, sil. Kendi profili ve şifresi. Çalışma saatleri ve izin günleri. |
| MUSTERI | Mobil | Kayıt/giriş, profil güncelleme, randevu oluşturma, randevuları görüntüleme/iptal/değiştirme, değerlendirme. |

Yetki kontrolü backend'de yapılır (guard + "kendi kaynağı mı" kontrolü). İstemci gizlemesine güvenilmez.

## Veri Modeli (özet)
- **User:** id, ad, soyad, telefon, email, passwordHash, role, isActive
- **Stylist:** userId, bio, fotoğraf, slotDakika (Stylist bir User'a bağlı)
- **Service:** ad, süreDk, fiyat, aktif
- **StylistService:** hangi kuaför hangi hizmeti verir
- **WorkingHours:** stylistId, haftanınGünü, başlangıç, bitiş, mola
- **TimeOff:** stylistId, başlangıç, bitiş, sebep
- **Appointment:** customerId, stylistId, serviceId, başlangıç, bitiş, status (BEKLIYOR / ONAYLANDI / IPTAL / TAMAMLANDI / GELMEDI), iptalEden, not
  - Çakışma engeli: DB seviyesinde exclusion constraint veya transaction + unique kontrol
- **Review:** appointmentId, puan (1-5), yorum
- **DeviceToken:** userId, expoPushToken
- **Notification log**
- **Soft delete:** "sil" işlemi kaydı deaktif eder (deletedAt). Geçmiş raporlar bozulmaz.

## API (REST, /api/v1)
- **Auth:** register, login, refresh, logout, forgot/reset password
- **Me:** GET/PATCH profil, şifre değiştirme
- **Müşteri:**
  - GET /stylists
  - GET /stylists/:id/availability?date&serviceId
  - POST/GET/PATCH/DELETE appointments (yalnızca kendi randevuları)
  - POST review
- **Kuaför:** kendi randevuları (GET, status güncelleme), working-hours, time-off
- **Admin:** stylists ve services CRUD, tüm appointments (filtre: kuaför/tarih/durum), müşteriler, raporlar
- **Müsaitlik hesabı:** çalışma saatleri − izinler − mevcut randevular = boş slot listesi

## Mobil Uygulama (Expo) Ekranları
Giriş/Kayıt → Kuaför listesi → Hizmet seç → Gün/saat seç (boş slotlar) → Ad/soyad/telefon (profilden otomatik dolu) → Onay özeti → Randevularım (yaklaşan/geçmiş, iptal/değiştir) → Profil → Bildirimler → Değerlendirme

## Web Panel (React) Sayfaları
Giriş → Dashboard (bugünkü randevular) → Randevu listesi + takvim görünümü (filtre, onayla/iptal/sil)
- **Admin:** Kuaförler (ekle/düzenle), Hizmetler, Müşteriler, Raporlar
- **Kuaför:** Çalışma saatleri, İzin günleri
- **Ortak:** Profilim

## Öneriler (henüz onaylanmadı)
- Randevu onay modu: otomatik onay veya kuaför onayı (ayarlanabilir)
- İptal kuralı: örn. randevuya 2 saat kala müşteri iptal edemez. Gelmeme (no-show) sayacı ve tekrarlarda kısıtlama.
- Öğrenci doğrulaması (öğrenci e-postası veya öğrenci indirimi). İhtiyaç belirsiz.
- Zaman dilimi: sunucuda UTC, gösterimde Europe/Istanbul
- KVKK: aydınlatma metni, hesap silme özelliği
- Admin denetim kaydı (audit log): kim neyi sildi/iptal etti
- Gelecek sürüm: SMS (NetGSM vb.), ödeme/kapora, iOS + Android yayını, çoklu şube

## Aşamalar
1. **Kurulum:** monorepo (apps/api, apps/web, apps/mobile, packages/shared tipler), DB şeması, CI, lint
2. **Backend çekirdeği:** Auth, roller, kuaför ve hizmet CRUD
3. **Müsaitlik + randevu:** oluşturma, çakışma kontrolü, durum akışı
4. **Web panel:** admin ve kuaför akışları
5. **Mobil uygulama:** müşteri akışı
6. **Bildirimler:** Expo Push + zamanlanmış hatırlatma job'ı, iptal kuralları, değerlendirme
7. **Test, güvenlik gözden geçirme, deploy:** API + DB (Railway/Render/VPS), web (statik hosting), mobil (EAS build)

## Doğrulama
- Backend birim ve entegrasyon testleri. Özellikle:
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
- **Dil:** Türkçe + İngilizce. Çeviri dosyaları ve dil seçimi gerekli.
