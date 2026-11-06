-- =====================================================================
-- SIFIRLAMA: public şemasındaki TÜM eski tabloları ve enum tiplerini siler.
-- Geri alınamaz. Canlı test verisi dahil her şey gider.
--
-- Çalıştırma sırası:
--   1) Bu dosya (bir kez).
--   2) Sonra saas-schema.sql.
--   3) Sonra aşağıdaki kontrol sorgusu, sıfır satır dönmeli.
--
-- Bu dosya şema dosyasından ayrıdır. Yanlışlıkla tekrar çalışırsa
-- yeni verileri de siler; bu yüzden ayrı tutulur.
-- =====================================================================

BEGIN;

DROP TABLE IF EXISTS
  "Ayar",
  "AdminIslem",
  "Odeme",
  "NotificationLog",
  "DeviceToken",
  "Review",
  "Appointment",
  "TimeOff",
  "WorkingHours",
  "Service",
  "StylistService",
  "Stylist",
  "Dukkan",
  "Isletme",
  "Ilce",
  "Il",
  "RefreshToken",
  "User",
  "Plan"
CASCADE;

DROP TYPE IF EXISTS "Role", "AppointmentStatus" CASCADE;

COMMIT;

-- Kontrol: aşağıdaki sorgu hiç satır dönmemeli.
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
