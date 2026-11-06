-- =====================================================================
-- TEST VERİSİ (saas-schema.sql için)
--
-- Ön koşul: saas-reset.sql, ardından saas-schema.sql çalıştırılmış olmalı.
-- Tüm test kullanıcılarının şifresi: Test1234!
-- Tarih referansı: 2026-11-06 (Cuma). Randevular ve ödeme kayıtları buna göre.
-- Tüm veri elle eklenen IDs ile yazılır; sonunda sequence'lar düzeltilir.
-- =====================================================================

BEGIN;

-- ---------- İl / ilçe (örnek; tam Türkiye veri seti ayrıca eklenecek) ----------
INSERT INTO "Il" ("id", "ad") VALUES
  (34, 'İstanbul'),
  (6,  'Ankara'),
  (35, 'İzmir');

INSERT INTO "Ilce" ("id", "ilId", "ad") VALUES
  (1, 34, 'Kadıköy'),
  (2, 34, 'Beşiktaş'),
  (3, 34, 'Üsküdar'),
  (4, 6,  'Çankaya'),
  (5, 6,  'Keçiören'),
  (6, 35, 'Bornova');

-- ---------- Kullanıcılar ----------
-- Şifre: Test1234!
INSERT INTO "User" ("id", "ad", "soyad", "telefon", "email", "passwordHash", "rol", "sifreDegismeli") VALUES
  (1,  'Platform', 'Admin',   '05000000001', 'admin@test.local',          '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'PLATFORM_ADMIN', false),
  -- İşletme sahipleri
  (2,  'Ayşe',     'Demir',   '05000000002', 'owner.gold@test.local',     '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'ISLETME_SAHIBI', false),
  (3,  'Mehmet',   'Kaya',    '05000000003', 'owner.silver@test.local',   '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'ISLETME_SAHIBI', false),
  (4,  'Zeynep',   'Acar',    '05000000004', 'owner.free@test.local',     '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'ISLETME_SAHIBI', false),
  (5,  'Ali',      'Çelik',   '05000000005', 'owner.pasif@test.local',    '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'ISLETME_SAHIBI', false),
  (6,  'Elif',     'Yılmaz',  '05000000006', 'owner.bekleyen@test.local', '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'ISLETME_SAHIBI', false),
  -- Kuaförler (sahip tarafından eklenmiş gibi)
  (7,  'Selin',    'Şahin',   '05000000007', 'stylist.gold1@test.local',  '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'KUAFOR', false),
  (8,  'Burak',    'Öz',      '05000000008', 'stylist.gold2@test.local',  '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'KUAFOR', false),
  (9,  'Deniz',    'Aydın',   '05000000009', 'stylist.gold3@test.local',  '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'KUAFOR', false),
  (10, 'Can',      'Polat',   '05000000010', 'stylist.silver1@test.local','$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'KUAFOR', false),
  (11, 'Ece',      'Koç',     '05000000011', 'stylist.silver2@test.local','$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'KUAFOR', true),   -- ilk girişte şifre değişmeli
  (12, 'Murat',    'Tan',     '05000000012', 'stylist.free1@test.local',  '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'KUAFOR', false),
  (13, 'Hale',     'Güneş',   '05000000013', 'stylist.pasif1@test.local', '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'KUAFOR', false),
  -- Müşteriler (mobil)
  (14, 'Ahmet',    'Yıldız',  '05000000014', 'musteri1@test.local',       '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'MUSTERI', false),
  (15, 'Gizem',    'Arslan',  '05000000015', 'musteri2@test.local',       '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'MUSTERI', false),
  (16, 'Kerem',    'Doğan',   '05000000016', 'musteri3@test.local',       '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'MUSTERI', false),
  (17, 'Naz',      'Kılıç',   '05000000017', 'musteri4@test.local',       '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO', 'MUSTERI', false);

-- ---------- İşletmeler ----------
-- 1 Gold   AKTIF   ödeme günü 6   (6 Kasım'da ödeme alındı)
-- 2 Silver AKTIF   ödeme günü 15  (15 Kasım'da ödeme bekliyor)
-- 3 Ücretsiz AKTIF (ödeme günü yok)
-- 4 Silver PASIF   ödeme günü 3   (3 Ekim ödemesi yok: geçmiş ödeme listesinde)
-- 5 Ücretsiz ONAY_BEKLIYOR
INSERT INTO "Isletme" ("id", "ad", "sahipId", "planKod", "durum", "odemeGunu", "onayTarihi", "onaylayanId") VALUES
  (1, 'Gold Salon',       2, 'GOLD',     'AKTIF',         6,    '2026-10-01 10:00+03', 1),
  (2, 'Silver Kuaför',    3, 'SILVER',   'AKTIF',         15,   '2026-10-01 10:05+03', 1),
  (3, 'Ücretsiz Berber',  4, 'UCRETSIZ', 'AKTIF',         NULL, '2026-10-01 10:10+03', 1),
  (4, 'Pasif Salon',      5, 'SILVER',   'PASIF',         3,    '2026-10-01 10:15+03', 1),
  (5, 'Bekleyen Salon',   6, 'UCRETSIZ', 'ONAY_BEKLIYOR', NULL, NULL,                  NULL);

-- ---------- Dükkanlar ----------
INSERT INTO "Dukkan" ("id", "isletmeId", "ad", "ilId", "ilceId", "adres", "telefon", "aktif") VALUES
  (1, 1, 'Gold Salon Kadıköy',     34, 1, 'Moda Cad. No:12',        '02165550001', true),
  (2, 1, 'Gold Salon Beşiktaş',    34, 2, 'Ortaköy Meydan No:4',    '02125550002', true),
  (3, 2, 'Silver Kuaför Çankaya',   6, 4, 'Kızılay Sk. No:8',       '03125550003', true),
  (4, 3, 'Ücretsiz Berber Bornova', 35, 6, 'Ege Mah. No:2',         '02325550004', true),
  (5, 4, 'Pasif Salon Üsküdar',    34, 3, 'Bulgurlu Cad. No:20',    '02165550005', true),
  (6, 5, 'Bekleyen Salon Kadıköy', 34, 1, 'Caferağa Mah. No:1',     '02165550006', true);

-- ---------- Kuaförler (her biri tek dükkanda) ----------
-- Gold dükkan 1: Selin, Burak. Gold dükkan 2: Deniz. Silver: Can, Ece.
-- Ücretsiz: Murat (4 hizmet, plan sınırında). Pasif salon: Hale.
INSERT INTO "Stylist" ("id", "userId", "dukkanId", "bio", "slotDakika", "aktif") VALUES
  (1, 7,  1, 'Saç kesim ve boyama uzmanı', 30, true),
  (2, 8,  1, 'Sakal ve erkek saç kesimi',  45, true),
  (3, 9,  2, 'Keratin ve bakım',           30, true),
  (4, 10, 3, 'Erkek saç kesimi',           30, true),
  (5, 11, 3, 'Fön ve manikür',             30, true),
  (6, 12, 4, 'Genel erkek bakımı',         30, true),
  (7, 13, 5, 'Cilt bakımı',                30, true);

-- ---------- Hizmetler (kuaföre bağlı) ----------
INSERT INTO "Service" ("id", "stylistId", "ad", "sureDk", "fiyat", "aktif") VALUES
  -- Selin (Gold, sınırsız)
  (1,  1, 'Saç kesim',    45,  350.00, true),
  (2,  1, 'Saç boyama',   120, 1200.00, true),
  (3,  1, 'Fön',          30,  200.00, true),
  -- Burak (Gold)
  (4,  2, 'Sakal tıraşı', 20,  150.00, true),
  (5,  2, 'Saç kesim',    30,  250.00, true),
  -- Deniz (Gold)
  (6,  3, 'Kaş',          15,  100.00, true),
  (7,  3, 'Keratin',      150, 2000.00, true),
  (8,  3, 'Saç kesim',    40,  300.00, true),
  (9,  3, 'Bakım',        60,  700.00, true),
  -- Can (Silver)
  (10, 4, 'Saç kesim',    30,  200.00, true),
  (11, 4, 'Sakal',        20,  120.00, true),
  -- Ece (Silver)
  (12, 5, 'Saç kesim',    30,  220.00, true),
  (13, 5, 'Fön',          30,  180.00, true),
  (14, 5, 'Manikür',      45,  250.00, true),
  -- Murat (Ücretsiz, tam 4 hizmet)
  (15, 6, 'Saç kesim',    30,  150.00, true),
  (16, 6, 'Sakal',        20,   80.00, true),
  (17, 6, 'Tıraş',        15,   60.00, true),
  (18, 6, 'Fön',          20,  100.00, true),
  -- Hale (pasif salon)
  (19, 7, 'Cilt bakımı',  60,  500.00, true);

-- ---------- Çalışma saatleri: tüm kuaförler Pzt-Cmt 09:00-19:00, öğle molası 13:00-14:00 ----------
-- Pazar (gun=0) yok: kapalı.
INSERT INTO "WorkingHours" ("stylistId", "gun", "baslangic", "bitis", "molaBaslangic", "molaBitis")
SELECT s, g, '09:00', '19:00', '13:00', '14:00'
FROM generate_series(1, 7) AS s, generate_series(1, 6) AS g;

-- ---------- İzin: Burak, 20 Kasım tatil ----------
INSERT INTO "TimeOff" ("id", "stylistId", "baslangic", "bitis", "sebep") VALUES
  (1, 2, '2026-11-20 00:00+03', '2026-11-21 00:00+03', 'Tatil');

-- ---------- Randevular ----------
-- Sütunlar: id, customerId, stylistId, serviceId, baslangic, bitis, status, iptalEdenId, notu
INSERT INTO "Appointment" ("id", "customerId", "stylistId", "serviceId", "baslangic", "bitis", "status", "iptalEdenId", "notu") VALUES
  -- Geçmiş, tamamlanmış (değerlendirmeli)
  (1,  14, 1, 1,  '2026-10-20 10:00+03', '2026-10-20 10:45+03', 'TAMAMLANDI', NULL, NULL),
  (2,  15, 1, 2,  '2026-10-25 14:00+03', '2026-10-25 16:00+03', 'TAMAMLANDI', NULL, NULL),
  -- Geçmiş, gelmedi
  (3,  16, 4, 10, '2026-10-28 11:00+03', '2026-10-28 11:30+03', 'GELMEDI',    NULL, NULL),
  -- Geçmiş, müşteri iptal etti
  (4,  14, 2, 4,  '2026-10-30 15:00+03', '2026-10-30 15:20+03', 'IPTAL',      14,   'Başka gün gelirim'),
  -- Gelecek: onaylı
  (5,  15, 1, 1,  '2026-11-10 10:00+03', '2026-11-10 10:45+03', 'ONAYLANDI',  NULL, NULL),
  (7,  16, 5, 12, '2026-11-06 12:00+03', '2026-11-06 12:30+03', 'ONAYLANDI',  NULL, NULL),
  (9,  15, 4, 11, '2026-11-09 16:00+03', '2026-11-09 16:20+03', 'ONAYLANDI',  NULL, NULL),
  -- Gelecek: onay bekliyor (kuaför onaylayacak)
  (6,  14, 3, 8,  '2026-11-07 13:00+03', '2026-11-07 13:40+03', 'BEKLIYOR',   NULL, NULL),
  (8,  17, 6, 15, '2026-11-12 09:00+03', '2026-11-12 09:30+03', 'BEKLIYOR',   NULL, NULL),
  -- Pasif salonun mevcut randevusu: kalmalı, yeni randevu alınamamalı
  (10, 17, 7, 19, '2026-11-16 11:00+03', '2026-11-16 12:00+03', 'ONAYLANDI',  NULL, NULL);

-- ---------- Değerlendirmeler (kuaför bazında) ----------
INSERT INTO "Review" ("id", "appointmentId", "userId", "stylistId", "puan", "yorum") VALUES
  (1, 1, 14, 1, 5, 'Harika bir kesim'),
  (2, 2, 15, 1, 4, 'Güzel, biraz geç başladı');

-- ---------- Bildirim kayıtları ----------
INSERT INTO "NotificationLog" ("id", "userId", "randevuId", "tip", "icerik", "gonderildi", "okundu") VALUES
  (1, 15, 5, 'ONAYLANDI', 'Randevunuz onaylandı: 10.11.2026 10:00', true, false),
  (2, 14, 4, 'IPTAL',     'Randevunuz iptal edildi',                 true, true);

-- ---------- Ödeme kayıtları ----------
-- Gold (1): 6 Ekim ve 6 Kasım ödendi. Bugün (6 Kasım) "Ödeme alındı" görünmeli.
-- Silver (2): 15 Ekim ödendi. 15 Kasım henüz gelmedi (liste: bekliyor).
-- Pasif (4): 3 Eylül ödendi, 3 Ekim ödenmedi (geçmiş ödeme sekmesinde).
INSERT INTO "Odeme" ("id", "isletmeId", "odemeTarihi", "tutar", "onaylayanId", "onaylandiAt") VALUES
  (1, 4, '2026-09-03', 800.00,  1, '2026-09-03 12:00+03'),
  (2, 1, '2026-10-06', 1500.00, 1, '2026-10-06 10:00+03'),
  (3, 2, '2026-10-15', 800.00,  1, '2026-10-15 11:00+03'),
  (4, 1, '2026-11-06', 1500.00, 1, '2026-11-06 09:30+03');

-- ---------- Havale bilgisi (admin ayarları) ----------
INSERT INTO "Ayar" ("anahtar", "deger") VALUES
  ('havale', '{"banka": "Test Bankası", "alici": "Test Salon Ltd. Şti.", "iban": "TR000000000000000000000000"}');

-- ---------- Admin denetim kaydı örnekleri ----------
INSERT INTO "AdminIslem" ("id", "adminId", "islem", "hedefTablo", "hedefId", "oncekiDeger", "yeniDeger") VALUES
  (1, 1, 'ISLETME_ONAY',  'Isletme', '1', NULL,                       '{"durum":"AKTIF"}'),
  (2, 1, 'ISLETME_PASIF', 'Isletme', '4', '{"durum":"AKTIF"}',        '{"durum":"PASIF"}'),
  (3, 1, 'ODEME_ONAY',    'Odeme',   '4', NULL,                       '{"isletmeId":1,"odemeTarihi":"2026-11-06","tutar":1500}');

-- ---------- Sequence'ları en büyük id'ye hizala (elle verilen id'lerden sonra) ----------
SELECT setval(pg_get_serial_sequence('"Il"', 'id'), (SELECT MAX("id") FROM "Il"));
SELECT setval(pg_get_serial_sequence('"Ilce"', 'id'), (SELECT MAX("id") FROM "Ilce"));
SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX("id") FROM "User"));
SELECT setval(pg_get_serial_sequence('"Isletme"', 'id'), (SELECT MAX("id") FROM "Isletme"));
SELECT setval(pg_get_serial_sequence('"Dukkan"', 'id'), (SELECT MAX("id") FROM "Dukkan"));
SELECT setval(pg_get_serial_sequence('"Stylist"', 'id'), (SELECT MAX("id") FROM "Stylist"));
SELECT setval(pg_get_serial_sequence('"Service"', 'id'), (SELECT MAX("id") FROM "Service"));
SELECT setval(pg_get_serial_sequence('"WorkingHours"', 'id'), (SELECT MAX("id") FROM "WorkingHours"));
SELECT setval(pg_get_serial_sequence('"TimeOff"', 'id'), (SELECT MAX("id") FROM "TimeOff"));
SELECT setval(pg_get_serial_sequence('"Appointment"', 'id'), (SELECT MAX("id") FROM "Appointment"));
SELECT setval(pg_get_serial_sequence('"Review"', 'id'), (SELECT MAX("id") FROM "Review"));
SELECT setval(pg_get_serial_sequence('"NotificationLog"', 'id'), (SELECT MAX("id") FROM "NotificationLog"));
SELECT setval(pg_get_serial_sequence('"Odeme"', 'id'), (SELECT MAX("id") FROM "Odeme"));
SELECT setval(pg_get_serial_sequence('"AdminIslem"', 'id'), (SELECT MAX("id") FROM "AdminIslem"));

COMMIT;

-- =====================================================================
-- Senaryo özeti
-- Giriş: e-posta, şifre Test1234!
--   admin@test.local           Platform admin: onay, ödeme takibi, aktif/pasif
--   owner.gold@test.local      Gold, 2 dükkan, AKTIF, ödeme günü 6
--   owner.silver@test.local    Silver, 1 dükkan, AKTIF, ödeme günü 15
--   owner.free@test.local      Ücretsiz, 1 dükkan, 1 kuaför (Murat), 4 hizmet, AKTIF
--   owner.pasif@test.local     PASIF: giriş yapamaz ("ödeme yapın" uyarısı)
--   owner.bekleyen@test.local  ONAY_BEKLIYOR: giriş yapamaz ("onay bekleniyor")
--   stylist.gold1/2/3@          Gold kuaförleri (Selin, Burak, Deniz)
--   stylist.silver1@            Can
--   stylist.silver2@            Ece: ilk girişte şifre değiştirmeli (sifreDegismeli = true)
--   stylist.free1@              Murat (Ücretsiz)
--   stylist.pasif1@             Hale: PASIF salonda, giriş yapamaz
--   musteri1..4@                Mobil müşteriler
--
-- Ödeme takibi, 6 Kasım 2026 seçilirse: Gold "Ödeme alındı".
-- 15 Kasım 2026 seçilirse: Silver "Ödeme onayla" butonu.
-- Geçmiş ödeme sekmesi: Pasif Salon (3 Ekim ödenmedi).
--
-- Hiçbir test verisi bir satırı silmez. Temizlik için saas-reset.sql.
-- =====================================================================
