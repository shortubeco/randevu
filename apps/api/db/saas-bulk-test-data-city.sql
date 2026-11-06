-- =====================================================================
-- İZMİR VE ANKARA İÇİN TOPLU TEST VERİSİ (Şehirlere göre en iyiler listesi için)
--
-- Ön koşul: saas-bulk-test-data.sql çalıştırılmış olmalı (İstanbul verisi).
-- Ilce tablosunda (İzmir Bornova: id 6, il 35; Ankara Çankaya: id 4, Keçiören: id 5, il 6) bulunmalı.
--
-- Eklenenler:
--   İşletme 10 (İzmir 5, Ankara 5), dükkan 10, kuaför 20, hizmet 60,
--   randevu ~800, değerlendirme (her kuaför için 3'ten fazla).
-- Tüm kayıtlar TEST olarak işaretlidir: e-posta bulk-*@test.local, şifre Test1234!
-- Bu dosya DO bloğu kullanmaz; her ifade ayrı ve noktalı virgülle biter.
-- Silmek için: saas-bulk-test-cleanup.sql (aynı bulk-*@test.local kuralıyla bulur).
-- =====================================================================

BEGIN;

SELECT setseed(0.7373);

-- ---------- İşletme sahipleri: n = 41..50 ----------
INSERT INTO "User" ("id", "ad", "soyad", "telefon", "email", "passwordHash", "rol", "sifreDegismeli", "updatedAt")
SELECT 10000 + n, 'Test', 'Sahip ' || n, '0551' || lpad(n::text, 7, '0'),
       'bulk-sahip' || n || '@test.local',
       '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO',
       'ISLETME_SAHIBI', false, now()
FROM generate_series(41, 50) AS n;

-- ---------- İşletmeler: n = 41..50 (çift n Silver, tek n Gold) ----------
INSERT INTO "Isletme" ("id", "ad", "sahipId", "planKod", "durum", "odemeGunu", "onayTarihi", "onaylayanId", "updatedAt")
SELECT 1000 + n, 'Test İşletme ' || n, 10000 + n,
       CASE WHEN n % 2 = 0 THEN 'SILVER' ELSE 'GOLD' END,
       'AKTIF', 1 + (n % 28), '2025-10-15 10:00+03',
       (SELECT "id" FROM "User" WHERE "rol" = 'PLATFORM_ADMIN' ORDER BY "id" LIMIT 1),
       now()
FROM generate_series(41, 50) AS n;

-- ---------- Dükkanlar: n = 41..45 İzmir (Bornova), 46..50 Ankara (Çankaya / Keçiören) ----------
INSERT INTO "Dukkan" ("id", "isletmeId", "ad", "ilId", "ilceId", "adres", "telefon", "aktif", "updatedAt")
SELECT 1000 + n, 1000 + n,
       'Test Dükkan ' || n,
       CASE WHEN n <= 45 THEN 35 ELSE 6 END,
       CASE WHEN n <= 45 THEN 6 WHEN n % 2 = 0 THEN 4 ELSE 5 END,
       'Test Mah. Test Sk. No:' || n,
       '0212' || lpad(n::text, 7, '0'),
       true, now()
FROM generate_series(41, 50) AS n;

-- ---------- Kuaför kullanıcıları: 2 per dükkan (id 20121..20140) ----------
INSERT INTO "User" ("id", "ad", "soyad", "telefon", "email", "passwordHash", "rol", "sifreDegismeli", "updatedAt")
SELECT 20121 + (n - 41) * 2 + (k - 1), 'Test', 'Kuaför ' || n || '-' || k,
       '0552' || lpad((1121 + (n - 41) * 2 + (k - 1))::text, 7, '0'),
       'bulk-kuafor' || (20121 + (n - 41) * 2 + (k - 1)) || '@test.local',
       '$2a$12$3.nDbKIYmwyZXN2h/PMR9uGDUrLE0ddzw6ogwez/ODDiaVuVxMtdO',
       'KUAFOR', false, now()
FROM generate_series(41, 50) AS n
CROSS JOIN generate_series(1, 2) AS k;

-- ---------- Kuaförler (id 1121..1140) ----------
INSERT INTO "Stylist" ("id", "userId", "dukkanId", "bio", "photoUrl", "slotDakika", "aktif", "updatedAt")
SELECT 1121 + (n - 41) * 2 + (k - 1), 20121 + (n - 41) * 2 + (k - 1), 1000 + n,
       'Test kuaför profili', NULL,
       CASE WHEN random() < 0.5 THEN 30 ELSE 45 END, true, now()
FROM generate_series(41, 50) AS n
CROSS JOIN generate_series(1, 2) AS k;

-- ---------- Hizmetler: kuaför başına 3 (id 1000 + (kuaför id - 1000)*3 + j) ----------
INSERT INTO "Service" ("id", "stylistId", "ad", "sureDk", "fiyat", "aktif", "updatedAt")
SELECT 1000 + (s."id" - 1000) * 3 + j, s."id",
       CASE j WHEN 1 THEN 'Test Saç kesim' WHEN 2 THEN 'Test Sakal' ELSE 'Test Boya' END,
       CASE j WHEN 1 THEN 30 WHEN 2 THEN 20 ELSE 60 END,
       (150 + floor(random() * 12) * 50)::numeric(10, 2),
       true, now()
FROM "Stylist" AS s
CROSS JOIN generate_series(1, 3) AS j
WHERE s."id" BETWEEN 1121 AND 1140;

-- ---------- Çalışma saatleri: Pazartesi-Cumartesi 09:00-19:00, öğle molası 13:00-14:00 ----------
INSERT INTO "WorkingHours" ("stylistId", "gun", "baslangic", "bitis", "molaBaslangic", "molaBitis")
SELECT s."id", g, '09:00', '19:00', '13:00', '14:00'
FROM "Stylist" AS s
CROSS JOIN generate_series(1, 6) AS g
WHERE s."id" BETWEEN 1121 AND 1140;

-- ---------- Randevular: kuaför başına 40 (9 günde bir) ----------
INSERT INTO "Appointment" ("id", "customerId", "stylistId", "serviceId", "baslangic", "bitis", "status", "updatedAt")
SELECT b.app, b.cus, b.st, b.svc,
       b.ts, b.ts + make_interval(mins => sv."sureDk"),
       CASE WHEN b.d < date '2026-11-07'
            THEN (CASE WHEN b.r1 < 0.85 THEN 'TAMAMLANDI' WHEN b.r1 < 0.93 THEN 'IPTAL' ELSE 'GELMEDI' END)
            ELSE (CASE WHEN b.r2 < 0.7 THEN 'ONAYLANDI' ELSE 'BEKLIYOR' END)
       END,
       now()
FROM (
  SELECT 100000 + (s."id" - 1000) * 100 + j AS app,
         30001 + floor(random() * 1200)::int AS cus,
         s."id" AS st,
         1000 + (s."id" - 1000) * 3 + (1 + floor(random() * 3))::int AS svc,
         (date '2025-11-03' + j * 9) AS d,
         ((date '2025-11-03' + j * 9) + time '10:00') AT TIME ZONE 'Europe/Istanbul' AS ts,
         random() AS r1,
         random() AS r2
  FROM "Stylist" AS s
  CROSS JOIN generate_series(0, 39) AS j
  WHERE s."id" BETWEEN 1121 AND 1140
) AS b
JOIN "Service" AS sv ON sv."id" = b.svc;

-- ---------- Değerlendirmeler: tamamlanan randevuların ~%60'ı (kuaför başına 3+ olacak şekilde) ----------
INSERT INTO "Review" ("id", "appointmentId", "userId", "stylistId", "puan", "yorum", "createdAt")
SELECT a.id, a.id, a."customerId", a."stylistId",
       CASE WHEN a.r2 < 0.45 THEN 5 WHEN a.r2 < 0.8 THEN 4 WHEN a.r2 < 0.93 THEN 3 WHEN a.r2 < 0.97 THEN 2 ELSE 1 END,
       'Test değerlendirmesi',
       a."baslangic" + interval '1 day'
FROM (
  SELECT ap."id", ap."customerId", ap."stylistId", ap."baslangic", random() AS r1, random() AS r2
  FROM "Appointment" AS ap
  WHERE ap."id" >= 100000 AND ap."stylistId" BETWEEN 1121 AND 1140 AND ap."status" = 'TAMAMLANDI'
) AS a
WHERE a.r1 < 0.6;

-- ---------- Ödemeler: ücretli planlar, son 12 ay (%95 ödenmiş) ----------
INSERT INTO "Odeme" ("id", "isletmeId", "odemeTarihi", "tutar", "onaylayanId", "onaylandiAt")
SELECT x.oid, x.isl, x.due, x.tutar, x.admin, (x.due + time '12:00') AT TIME ZONE 'Europe/Istanbul'
FROM (
  SELECT 100000 + (i."id" - 1000) * 100 + m AS oid,
         i."id" AS isl,
         make_date(extract(year FROM dt.dd)::int, extract(month FROM dt.dd)::int,
                   LEAST(i."odemeGunu", extract(day FROM (date_trunc('month', dt.dd) + interval '1 month - 1 day'))::int)) AS due,
         p."aylikUcret" AS tutar,
         (SELECT "id" FROM "User" WHERE "rol" = 'PLATFORM_ADMIN' ORDER BY "id" LIMIT 1) AS admin,
         random() AS r
  FROM "Isletme" AS i
  JOIN "Plan" AS p ON p."kod" = i."planKod"
  CROSS JOIN generate_series(0, 11) AS m
  CROSS JOIN LATERAL (SELECT (date '2025-11-01' + (m || ' months')::interval)::date AS dd) AS dt
  WHERE i."id" BETWEEN 1041 AND 1050
) AS x
WHERE x.r < 0.95;

-- ---------- Sequence'ları en büyük id'ye hizala ----------
SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX("id") FROM "User"));
SELECT setval(pg_get_serial_sequence('"Isletme"', 'id'), (SELECT MAX("id") FROM "Isletme"));
SELECT setval(pg_get_serial_sequence('"Dukkan"', 'id'), (SELECT MAX("id") FROM "Dukkan"));
SELECT setval(pg_get_serial_sequence('"Stylist"', 'id'), (SELECT MAX("id") FROM "Stylist"));
SELECT setval(pg_get_serial_sequence('"Service"', 'id'), (SELECT MAX("id") FROM "Service"));
SELECT setval(pg_get_serial_sequence('"Appointment"', 'id'), (SELECT MAX("id") FROM "Appointment"));
SELECT setval(pg_get_serial_sequence('"Review"', 'id'), (SELECT MAX("id") FROM "Review"));
SELECT setval(pg_get_serial_sequence('"Odeme"', 'id'), (SELECT MAX("id") FROM "Odeme"));
SELECT setval(pg_get_serial_sequence('"WorkingHours"', 'id'), (SELECT MAX("id") FROM "WorkingHours"));

COMMIT;
