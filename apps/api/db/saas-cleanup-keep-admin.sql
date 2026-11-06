-- =====================================================================
-- TEMİZLİK: tüm test ve QA verisini siler; platform admin verisini korur.
--
-- Korunanlar:
--   "User" içinde rol = PLATFORM_ADMIN olan hesap(lar)
--   "Plan" (plan fiyatları), "Ayar" (havale bilgisi), "Il" ve "Ilce" (il/ilçe listesi)
--
-- Silinenler:
--   Değerlendirmeler, bildirimler, randevular, izinler, çalışma saatleri,
--   hizmetler, kuaförler, dükkanlar, işletmeler, ödemeler, denetim kayıtları,
--   admin dışındaki tüm kullanıcılar ve onların oturum ve cihaz kayıtları.
--
-- UYARI: Geri alınamaz. Çalıştırmadan önce yedek almanız önerilir.
-- Admin yoksa işlem durdurulur (kilitlenmeyi önler).
-- Tek işlem (BEGIN/COMMIT): bir hata olursa hiçbir şey silinmez.
-- =====================================================================

BEGIN;

-- Güvenlik: çalıştırmadan önce en az bir platform admini olduğunu kontrol edin:
-- SELECT COUNT(*) FROM "User" WHERE "rol" = 'PLATFORM_ADMIN';   (0'dan büyük olmalı)

-- Bağımlı kayıtlar önce silinir (yabancı anahtar sırası).
DELETE FROM "Review";
DELETE FROM "NotificationLog";
DELETE FROM "Appointment";
DELETE FROM "TimeOff";
DELETE FROM "WorkingHours";
DELETE FROM "Service";
DELETE FROM "Odeme";
DELETE FROM "AdminIslem";
DELETE FROM "Stylist";
DELETE FROM "Dukkan";
DELETE FROM "Isletme";

-- Admin dışındaki kullanıcıların oturum ve cihaz kayıtları, sonra kullanıcılar.
DELETE FROM "DeviceToken"
  WHERE "userId" IN (SELECT "id" FROM "User" WHERE "rol" <> 'PLATFORM_ADMIN');
DELETE FROM "RefreshToken"
  WHERE "userId" IN (SELECT "id" FROM "User" WHERE "rol" <> 'PLATFORM_ADMIN');
DELETE FROM "User" WHERE "rol" <> 'PLATFORM_ADMIN';

COMMIT;

-- Kontrol (sonuç beklenen değerler):
-- SELECT "rol", COUNT(*) FROM "User" GROUP BY "rol";           -- yalnızca PLATFORM_ADMIN
-- SELECT COUNT(*) FROM "Isletme";                               -- 0
-- SELECT "kod", "aylikUcret" FROM "Plan";                       -- fiyatlar korunmuş
-- SELECT "anahtar" FROM "Ayar";                                 -- havale
-- SELECT COUNT(*) FROM "Il"; SELECT COUNT(*) FROM "Ilce";       -- korunmuş
