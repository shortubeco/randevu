-- =====================================================================
-- SaaS veri modeli (taslak, 2026-11-06)
-- Hedef: PostgreSQL 10 (cPanel). Eski tek salon şeması yerine kullanılır.
-- Kaynak kararlar: PROJE_PLANI.md, "SaaS Dönüşümü" bölümü.
--
-- Hiyerarşi:
--   Isletme (abonelik sahibi hesap, planı var)
--     └─ Dukkan (1 veya sınırsız, plana göre)
--          └─ Stylist (kuaför, tek dükkana bağlı)
--               ├─ Service (hizmet, kuaföre bağlı)
--               ├─ WorkingHours
--               └─ TimeOff
--
-- Plan limitleri (Plan tablosu) uygulama katmanında, Isletme satırı
-- SELECT ... FOR UPDATE ile kilitlenerek kontrol edilir (dükkan/kuaför/hizmet eklerken).
-- Bu yüzden veritabanında plan limiti için trigger yok.
--
-- Uygulama: önce saas-reset.sql (eski tüm tabloları siler), sonra bu dosya.
-- Her ikisi de elle, phpPgAdmin SQL penceresinde, BEGIN/COMMIT içinde çalıştırılır.
-- =====================================================================

BEGIN;

-- ---------- Plan (limitler sabit; fiyat admin panelinden belirlenir) ----------
-- Limitler NULL = sınırsız.
-- aylikUcret NULL = henüz belirlenmedi (admin panelinden girilir).
CREATE TABLE "Plan" (
  "kod"             TEXT PRIMARY KEY CHECK ("kod" IN ('UCRETSIZ', 'SILVER', 'GOLD')),
  "ad"              TEXT NOT NULL,
  "siralama"        INTEGER NOT NULL,      -- ilçe listesi: küçük önce (Gold=1, Silver=2, Ücretsiz=3)
  "maxDukkan"       INTEGER,               -- işletme başına dükkan
  "maxKuaforDukkan" INTEGER,               -- dükkan başına kuaför
  "maxHizmetKuafor" INTEGER,               -- kuaför başına hizmet
  "aylikUcret"      NUMERIC(10,2) CHECK ("aylikUcret" >= 0)
);

INSERT INTO "Plan" ("kod", "ad", "siralama", "maxDukkan", "maxKuaforDukkan", "maxHizmetKuafor", "aylikUcret") VALUES
  ('GOLD',     'Gold',     1, NULL, NULL, NULL, NULL),
  ('SILVER',   'Silver',   2, 1,    NULL, NULL, NULL),
  ('UCRETSIZ', 'Ücretsiz', 3, 1,    1,    4,    0);

-- ---------- Türkiye il / ilçe ----------
CREATE TABLE "Il" (
  "id" SERIAL PRIMARY KEY,
  "ad" TEXT NOT NULL UNIQUE
);

CREATE TABLE "Ilce" (
  "id"    SERIAL PRIMARY KEY,
  "ilId"  INTEGER NOT NULL REFERENCES "Il"("id") ON DELETE RESTRICT,
  "ad"    TEXT NOT NULL,
  UNIQUE ("ilId", "ad"),
  -- Dukkan tablosunun ilçenin gerçekten bu ile ait olduğunu zorlamak için
  UNIQUE ("id", "ilId")
);

-- ---------- Kullanıcı (giriş yapan herkes) ----------
-- rol: PLATFORM_ADMIN | ISLETME_SAHIBI | KUAFOR | MUSTERI
-- Pasiflik kullanıcıda değil, işletmede tutulur (Isletme.durum).
CREATE TABLE "User" (
  "id"            SERIAL PRIMARY KEY,
  "ad"            TEXT NOT NULL,
  "soyad"         TEXT NOT NULL,
  "telefon"       TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "passwordHash"  TEXT NOT NULL,
  "rol"           TEXT NOT NULL CHECK ("rol" IN ('PLATFORM_ADMIN', 'ISLETME_SAHIBI', 'KUAFOR', 'MUSTERI')),
  -- Kuaför ilk girişte geçici şifresini değiştirmek zorunda
  "sifreDegismeli" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt"     TIMESTAMPTZ
);
CREATE UNIQUE INDEX "User_email_key" ON "User" (lower("email"));

-- ---------- İşletme (abonelik hesabı) ----------
-- durum: ONAY_BEKLIYOR (kayıt sonrası, admin onayı yok)
--        AKTIF         (onaylı ve ödemesi güncel)
--        PASIF         (admin elle pasife aldı veya ödeme yapılmadı)
-- odemeGunu: ayın günü (1-31), admin belirler. Ücretsiz planda boş kalır.
-- Plan ve ödeme günü dışında hiçbir alan otomatik değişmez.
CREATE TABLE "Isletme" (
  "id"          SERIAL PRIMARY KEY,
  "ad"          TEXT NOT NULL,
  "sahipId"     INTEGER NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE RESTRICT,
  "planKod"     TEXT NOT NULL REFERENCES "Plan"("kod") ON DELETE RESTRICT,
  "durum"       TEXT NOT NULL DEFAULT 'ONAY_BEKLIYOR'
                  CHECK ("durum" IN ('ONAY_BEKLIYOR', 'AKTIF', 'PASIF')),
  "odemeGunu"   SMALLINT CHECK ("odemeGunu" BETWEEN 1 AND 31),
  "onayTarihi"  TIMESTAMPTZ,
  "onaylayanId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ücretli plan aktif edilirken ödeme günü zorunlu. Ücretsiz plan için gerekmez.
  CONSTRAINT "Isletme_aktif_odeme_gunu" CHECK (
    "durum" <> 'AKTIF' OR "planKod" = 'UCRETSIZ' OR "odemeGunu" IS NOT NULL
  )
);

-- ---------- Dükkan ----------
CREATE TABLE "Dukkan" (
  "id"         SERIAL PRIMARY KEY,
  "isletmeId"  INTEGER NOT NULL REFERENCES "Isletme"("id") ON DELETE RESTRICT,
  "ad"         TEXT NOT NULL,
  "ilId"       INTEGER NOT NULL REFERENCES "Il"("id") ON DELETE RESTRICT,
  "ilceId"     INTEGER NOT NULL,
  "adres"      TEXT,
  "telefon"    TEXT,
  "aktif"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt"  TIMESTAMPTZ,
  FOREIGN KEY ("ilceId", "ilId") REFERENCES "Ilce"("id", "ilId") ON DELETE RESTRICT
);
CREATE INDEX "Dukkan_isletmeId_idx" ON "Dukkan" ("isletmeId");
CREATE INDEX "Dukkan_ilceId_idx" ON "Dukkan" ("ilceId");

-- ---------- Kuaför ----------
-- Her kuaför tek dükkanda çalışır (dukkanId tek kolon).
CREATE TABLE "Stylist" (
  "id"          SERIAL PRIMARY KEY,
  "userId"      INTEGER NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE RESTRICT,
  "dukkanId"    INTEGER NOT NULL REFERENCES "Dukkan"("id") ON DELETE RESTRICT,
  "bio"         TEXT,
  "photoUrl"    TEXT,
  "slotDakika"  INTEGER NOT NULL DEFAULT 30 CHECK ("slotDakika" > 0),
  "aktif"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt"   TIMESTAMPTZ
);
CREATE INDEX "Stylist_dukkanId_idx" ON "Stylist" ("dukkanId");

-- ---------- Hizmet (kuaföre bağlı) ----------
CREATE TABLE "Service" (
  "id"         SERIAL PRIMARY KEY,
  "stylistId"  INTEGER NOT NULL REFERENCES "Stylist"("id") ON DELETE RESTRICT,
  "ad"         TEXT NOT NULL,
  "sureDk"     INTEGER NOT NULL CHECK ("sureDk" > 0),
  "fiyat"      NUMERIC(10,2) NOT NULL CHECK ("fiyat" >= 0),
  "aktif"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt"  TIMESTAMPTZ
);
CREATE INDEX "Service_stylistId_idx" ON "Service" ("stylistId");

-- ---------- Çalışma saatleri (gün başına birden fazla satır olabilir) ----------
CREATE TABLE "WorkingHours" (
  "id"            SERIAL PRIMARY KEY,
  "stylistId"     INTEGER NOT NULL REFERENCES "Stylist"("id") ON DELETE RESTRICT,
  "gun"           SMALLINT NOT NULL CHECK ("gun" BETWEEN 0 AND 6),   -- 0=Pazar..6=Cumartesi
  "baslangic"     TEXT NOT NULL,                                     -- HH:mm
  "bitis"         TEXT NOT NULL,
  "molaBaslangic" TEXT,
  "molaBitis"     TEXT
);
CREATE INDEX "WorkingHours_stylistId_gun_idx" ON "WorkingHours" ("stylistId", "gun");

-- ---------- İzin ----------
CREATE TABLE "TimeOff" (
  "id"         SERIAL PRIMARY KEY,
  "stylistId"  INTEGER NOT NULL REFERENCES "Stylist"("id") ON DELETE RESTRICT,
  "baslangic"  TIMESTAMPTZ NOT NULL,
  "bitis"      TIMESTAMPTZ NOT NULL,
  "sebep"      TEXT,
  CHECK ("bitis" > "baslangic")
);
CREATE INDEX "TimeOff_stylistId_baslangic_idx" ON "TimeOff" ("stylistId", "baslangic");

-- ---------- Randevu ----------
-- Pasif işletmenin randevuları silinmez; yeni randevu alınamaz (uygulama kontrolü).
CREATE TABLE "Appointment" (
  "id"          SERIAL PRIMARY KEY,
  "customerId"  INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "stylistId"   INTEGER NOT NULL REFERENCES "Stylist"("id") ON DELETE RESTRICT,
  "serviceId"   INTEGER NOT NULL REFERENCES "Service"("id") ON DELETE RESTRICT,
  "baslangic"   TIMESTAMPTZ NOT NULL,
  "bitis"       TIMESTAMPTZ NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'BEKLIYOR'
                  CHECK ("status" IN ('BEKLIYOR', 'ONAYLANDI', 'IPTAL', 'TAMAMLANDI', 'GELMEDI')),
  "iptalEdenId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "notu"        TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt"   TIMESTAMPTZ,
  CHECK ("bitis" > "baslangic")
);
CREATE INDEX "Appointment_stylistId_baslangic_idx" ON "Appointment" ("stylistId", "baslangic");
CREATE INDEX "Appointment_customerId_idx" ON "Appointment" ("customerId");

-- ---------- Değerlendirme (kuaför bazında) ----------
CREATE TABLE "Review" (
  "id"            SERIAL PRIMARY KEY,
  "appointmentId" INTEGER NOT NULL UNIQUE REFERENCES "Appointment"("id") ON DELETE RESTRICT,
  "userId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "stylistId"     INTEGER NOT NULL REFERENCES "Stylist"("id") ON DELETE RESTRICT,
  "puan"          INTEGER NOT NULL CHECK ("puan" BETWEEN 1 AND 5),
  "yorum"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "Review_stylistId_idx" ON "Review" ("stylistId");

-- ---------- Cihaz ve bildirim ----------
CREATE TABLE "DeviceToken" (
  "id"            SERIAL PRIMARY KEY,
  "userId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expoPushToken" TEXT NOT NULL UNIQUE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "NotificationLog" (
  "id"          SERIAL PRIMARY KEY,
  "userId"      INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "randevuId"   INTEGER REFERENCES "Appointment"("id") ON DELETE SET NULL,
  "tip"         TEXT NOT NULL,
  "icerik"      TEXT NOT NULL,
  "gonderildi"  BOOLEAN NOT NULL DEFAULT false,
  "okundu"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "NotificationLog_userId_okundu_idx" ON "NotificationLog" ("userId", "okundu");

-- ---------- Oturum (refresh token, yalnızca hash) ----------
CREATE TABLE "RefreshToken" (
  "id"         SERIAL PRIMARY KEY,
  "userId"     INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash"  TEXT NOT NULL UNIQUE,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "revokedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken" ("userId");

-- ---------- Ödeme kaydı (admin onayı sonrası oluşur) ----------
-- Her işletme için her ödeme tarihi tek kayıt. UNIQUE, çift onayı engeller.
-- Aktif/pasif durumu bu tabloda tutulmaz; Isletme.durum değişir.
CREATE TABLE "Odeme" (
  "id"          SERIAL PRIMARY KEY,
  "isletmeId"   INTEGER NOT NULL REFERENCES "Isletme"("id") ON DELETE RESTRICT,
  "odemeTarihi" DATE NOT NULL,                  -- ödemenin ait olduğu tarih (ör. 2026-11-06)
  "tutar"       NUMERIC(10,2) NOT NULL CHECK ("tutar" >= 0),  -- onay anındaki plan fiyatı (snapshot)
  "onaylayanId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "onaylandiAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("isletmeId", "odemeTarihi")
);
CREATE INDEX "Odeme_odemeTarihi_idx" ON "Odeme" ("odemeTarihi");

-- ---------- Admin denetim kaydı ----------
-- Admin'in onay, aktif/pasif, ödeme günü, plan fiyatı değişiklikleri.
-- islem örnekleri: ISLETME_ONAY, ISLETME_AKTIF, ISLETME_PASIF, ISLETME_ODEME_GUNU,
--                  ODEME_ONAY, PLAN_FIYAT
CREATE TABLE "AdminIslem" (
  "id"          SERIAL PRIMARY KEY,
  "adminId"     INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "islem"       TEXT NOT NULL,
  "hedefTablo"  TEXT NOT NULL,        -- Isletme, Odeme, Plan
  "hedefId"     TEXT NOT NULL,        -- satır id'si (Plan için kod)
  "oncekiDeger" JSONB,
  "yeniDeger"   JSONB,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "AdminIslem_hedef_idx" ON "AdminIslem" ("hedefTablo", "hedefId");
CREATE INDEX "AdminIslem_createdAt_idx" ON "AdminIslem" ("createdAt");

-- ---------- Sistem ayarları (anahtar-değer) ----------
-- anahtar örnekleri: 'havale' -> {"banka": "...", "alici": "...", "iban": "..."}
-- Admin panelinden yönetilir. Kayıt yoksa ödeme ekranında havale bilgisi boş gösterilir.
CREATE TABLE "Ayar" (
  "anahtar"   TEXT PRIMARY KEY,
  "deger"     JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Yetkiler (CLAUDE.md kuralı) ----------
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO sozcpdjd_usradm;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sozcpdjd_usradm;

COMMIT;

-- =====================================================================
-- Sorgu örnekleri (uygulama tarafında kullanılacak)
-- =====================================================================
-- 1) Ödeme takibi, seçilen tarih $1 (ör. 2026-11-06) için:
--    Ayın günü eşleşen işletmeler. Ayın son günü seçildiyse 29-31 olan
--    ödeme günleri de bu güne kayar.
--
-- SELECT i."id", i."ad", i."durum", p."ad" AS "plan", o."id" AS "odemeId", o."onaylandiAt"
-- FROM "Isletme" i
-- JOIN "Plan" p ON p."kod" = i."planKod"
-- LEFT JOIN "Odeme" o ON o."isletmeId" = i."id" AND o."odemeTarihi" = $1::date
-- WHERE i."odemeGunu" IS NOT NULL
--   AND (
--     i."odemeGunu" = EXTRACT(DAY FROM $1::date)
--     OR (
--       i."odemeGunu" > EXTRACT(DAY FROM $1::date)
--       AND $1::date = (date_trunc('month', $1::date) + INTERVAL '1 month - 1 day')::date
--     )
--   )
-- ORDER BY p."siralama", i."ad";
--
-- 2) "Ödemesi geçmiş" sekmesi: ödeme günü geçmiş ama bu dönem için Odeme kaydı yok.
--    (Dönem = son ödeme günü; 29-31 kuralı aynı şekilde uygulanır.)
--
-- 3) İlçe listesi (müşteri): aktif işletmelerin aktif dükkanları, plan sırasına göre.
--
-- SELECT d."id", d."ad", i."ad" AS "isletme", p."kod" AS "plan"
-- FROM "Dukkan" d
-- JOIN "Isletme" i ON i."id" = d."isletmeId"
-- JOIN "Plan" p ON p."kod" = i."planKod"
-- WHERE d."ilceId" = $1 AND d."aktif" AND d."deletedAt" IS NULL AND i."durum" = 'AKTIF'
-- ORDER BY p."siralama", d."ad";
