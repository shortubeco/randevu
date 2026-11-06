-- =====================================================================
-- TOPLU TEST VERİSİNİ SİLER (saas-bulk-test-data.sql ile eklenenler)
--
-- Hedef: e-postası bulk-%@test.local olan kullanıcılar ve bunlara bağlı
-- işletme, dükkan, kuaför, hizmet, randevu, değerlendirme, ödeme kayıtları.
-- Gerçek kullanıcılar ve saas-test-data.sql kayıtları (admin dahil) korunur.
--
-- Geri alınamaz. BEGIN/COMMIT: hata olursa hiçbir şey silinmez.
-- =====================================================================

BEGIN;

-- Bağlı kayıtlar önce (yabancı anahtar sırası).
DELETE FROM "Review"
  WHERE "stylistId" IN (
    SELECT s."id" FROM "Stylist" s JOIN "User" u ON u."id" = s."userId"
    WHERE u."email" LIKE 'bulk-%@test.local');

DELETE FROM "NotificationLog"
  WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" LIKE 'bulk-%@test.local');

DELETE FROM "Appointment"
  WHERE "stylistId" IN (
    SELECT s."id" FROM "Stylist" s JOIN "User" u ON u."id" = s."userId"
    WHERE u."email" LIKE 'bulk-%@test.local');

DELETE FROM "TimeOff"
  WHERE "stylistId" IN (
    SELECT s."id" FROM "Stylist" s JOIN "User" u ON u."id" = s."userId"
    WHERE u."email" LIKE 'bulk-%@test.local');

DELETE FROM "WorkingHours"
  WHERE "stylistId" IN (
    SELECT s."id" FROM "Stylist" s JOIN "User" u ON u."id" = s."userId"
    WHERE u."email" LIKE 'bulk-%@test.local');

DELETE FROM "Service"
  WHERE "stylistId" IN (
    SELECT s."id" FROM "Stylist" s JOIN "User" u ON u."id" = s."userId"
    WHERE u."email" LIKE 'bulk-%@test.local');

DELETE FROM "Odeme"
  WHERE "isletmeId" IN (
    SELECT i."id" FROM "Isletme" i JOIN "User" u ON u."id" = i."sahipId"
    WHERE u."email" LIKE 'bulk-%@test.local');

DELETE FROM "Stylist"
  WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" LIKE 'bulk-%@test.local');

DELETE FROM "Dukkan"
  WHERE "isletmeId" IN (
    SELECT i."id" FROM "Isletme" i JOIN "User" u ON u."id" = i."sahipId"
    WHERE u."email" LIKE 'bulk-%@test.local');

DELETE FROM "Isletme"
  WHERE "sahipId" IN (SELECT "id" FROM "User" WHERE "email" LIKE 'bulk-%@test.local');

DELETE FROM "DeviceToken"
  WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" LIKE 'bulk-%@test.local');

DELETE FROM "RefreshToken"
  WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" LIKE 'bulk-%@test.local');

DELETE FROM "User" WHERE "email" LIKE 'bulk-%@test.local';

COMMIT;

-- Kontrol: aşağıdaki sonuç 0 olmalı.
-- SELECT COUNT(*) FROM "User" WHERE "email" LIKE 'bulk-%@test.local';
