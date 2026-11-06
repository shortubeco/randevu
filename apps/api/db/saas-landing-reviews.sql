-- =====================================================================
-- Landing sayfası için test değerlendirmeleri (canlıya import edilecek)
--
-- Ön koşul: saas-reset.sql, saas-schema.sql ve saas-test-data.sql çalıştırılmış olmalı.
-- Her değerlendirme, tamamlanmış bir randevuya bağlanır (şema gereği).
-- Geçmiş tarihli (Eylül 2026) randevular, hepsi TAMAMLANDI.
--
-- Sonuç (landing kuralı: en az 3 değerlendirme):
--   Selin (İstanbul, Gold)    4 değerlendirme, ort. 4,75
--   Burak (İstanbul, Gold)    3 değerlendirme, ort. 4,00
--   Deniz (İstanbul, Gold)    4 değerlendirme, ort. 4,75
--   Can   (Ankara, Silver)    3 değerlendirme, ort. 4,33
--   Ece   (Ankara, Silver)    3 değerlendirme, ort. 4,33
--   Murat (İzmir, Ücretsiz)   3 değerlendirme, ort. 3,67
--
-- Tüm kayıtlar elle verilen id ile eklenir; sonunda sequence'lar hizalanır.
-- Hata olursa hiçbir şey kaydedilmez (BEGIN/COMMIT).
-- =====================================================================

BEGIN;

-- ---------- Tamamlanmış geçmiş randevular (id 11-28) ----------
INSERT INTO "Appointment" ("id", "customerId", "stylistId", "serviceId", "baslangic", "bitis", "status", "updatedAt") VALUES
  -- Selin (kuaför 1, hizmet 1: Saç kesim 45 dk)
  (11, 15, 1, 1,  '2026-09-05 10:00+03', '2026-09-05 10:45+03', 'TAMAMLANDI', now()),
  (12, 16, 1, 1,  '2026-09-12 11:00+03', '2026-09-12 11:45+03', 'TAMAMLANDI', now()),
  -- Burak (kuaför 2, hizmet 4: Sakal tıraşı 20 dk)
  (13, 14, 2, 4,  '2026-09-08 15:00+03', '2026-09-08 15:20+03', 'TAMAMLANDI', now()),
  (14, 15, 2, 4,  '2026-09-15 15:00+03', '2026-09-15 15:20+03', 'TAMAMLANDI', now()),
  (15, 17, 2, 4,  '2026-09-22 16:00+03', '2026-09-22 16:20+03', 'TAMAMLANDI', now()),
  -- Deniz (kuaför 3, hizmet 8: Saç kesim 40 dk)
  (16, 14, 3, 8,  '2026-09-10 13:00+03', '2026-09-10 13:40+03', 'TAMAMLANDI', now()),
  (17, 16, 3, 8,  '2026-09-17 13:00+03', '2026-09-17 13:40+03', 'TAMAMLANDI', now()),
  (18, 15, 3, 8,  '2026-09-24 14:00+03', '2026-09-24 14:40+03', 'TAMAMLANDI', now()),
  (19, 17, 3, 8,  '2026-10-01 14:00+03', '2026-10-01 14:40+03', 'TAMAMLANDI', now()),
  -- Can (kuaför 4, hizmet 10: Saç kesim 30 dk)
  (20, 16, 4, 10, '2026-09-09 11:00+03', '2026-09-09 11:30+03', 'TAMAMLANDI', now()),
  (21, 17, 4, 10, '2026-09-16 12:00+03', '2026-09-16 12:30+03', 'TAMAMLANDI', now()),
  (22, 14, 4, 10, '2026-09-23 11:00+03', '2026-09-23 11:30+03', 'TAMAMLANDI', now()),
  -- Ece (kuaför 5, hizmet 12: Saç kesim 30 dk)
  (23, 15, 5, 12, '2026-09-11 12:00+03', '2026-09-11 12:30+03', 'TAMAMLANDI', now()),
  (24, 16, 5, 12, '2026-09-18 12:00+03', '2026-09-18 12:30+03', 'TAMAMLANDI', now()),
  (25, 17, 5, 12, '2026-09-25 13:00+03', '2026-09-25 13:30+03', 'TAMAMLANDI', now()),
  -- Murat (kuaför 6, hizmet 15: Saç kesim 30 dk)
  (26, 14, 6, 15, '2026-09-14 09:00+03', '2026-09-14 09:30+03', 'TAMAMLANDI', now()),
  (27, 15, 6, 15, '2026-09-21 09:00+03', '2026-09-21 09:30+03', 'TAMAMLANDI', now()),
  (28, 16, 6, 15, '2026-09-28 10:00+03', '2026-09-28 10:30+03', 'TAMAMLANDI', now());

-- ---------- Değerlendirmeler (id 3-20; 1-2 test verisinde zaten var) ----------
INSERT INTO "Review" ("id", "appointmentId", "userId", "stylistId", "puan", "yorum") VALUES
  (3,  11, 15, 1, 5, 'Harika bir kesim, çok ilgililer'),
  (4,  12, 16, 1, 5, 'Çok memnun kaldım'),
  (5,  13, 14, 2, 4, 'Sakal tam istediğim gibi oldu'),
  (6,  14, 15, 2, 5, 'Hızlı ve temiz'),
  (7,  15, 17, 2, 3, 'Biraz bekledim'),
  (8,  16, 14, 3, 5, 'Keratin sonucu mükemmel'),
  (9,  17, 16, 3, 5, 'Her zaman en iyisini yapıyor'),
  (10, 18, 15, 3, 4, 'Güzel bir deneyimdi'),
  (11, 19, 17, 3, 5, 'Tavsiye ederim'),
  (12, 20, 16, 4, 4, 'Temiz ve düzgün bir kesim'),
  (13, 21, 17, 4, 4, 'Fiyatına göre iyi'),
  (14, 22, 14, 4, 5, 'Çok beğendim'),
  (15, 23, 15, 5, 5, 'Saç kesimim harikaydı'),
  (16, 24, 16, 5, 4, 'Güler yüzlü ve hızlı'),
  (17, 25, 17, 5, 4, 'Tekrar geleceğim'),
  (18, 26, 14, 6, 3, 'Fena değil'),
  (19, 27, 15, 6, 4, 'Memnun kaldım'),
  (20, 28, 16, 6, 4, 'Uygun fiyatlı, iyi bir kesim');

-- ---------- Sequence'ları en büyük id'ye hizala ----------
SELECT setval(pg_get_serial_sequence('"Appointment"', 'id'), (SELECT MAX("id") FROM "Appointment"));
SELECT setval(pg_get_serial_sequence('"Review"', 'id'), (SELECT MAX("id") FROM "Review"));

COMMIT;
