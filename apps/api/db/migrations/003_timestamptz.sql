-- Randevu ve izin zamanlarını saat dilimli (TIMESTAMPTZ) tipe çevirir.
-- Değerler UTC kabul edilerek dönüştürülür. Tablolar boş olduğu için veri kaybı yoktur.

ALTER TABLE "Appointment"
    ALTER COLUMN "baslangic" TYPE TIMESTAMPTZ(3) USING "baslangic" AT TIME ZONE 'UTC',
    ALTER COLUMN "bitis" TYPE TIMESTAMPTZ(3) USING "bitis" AT TIME ZONE 'UTC',
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "deletedAt" TYPE TIMESTAMPTZ(3) USING "deletedAt" AT TIME ZONE 'UTC';

ALTER TABLE "TimeOff"
    ALTER COLUMN "baslangic" TYPE TIMESTAMPTZ(3) USING "baslangic" AT TIME ZONE 'UTC',
    ALTER COLUMN "bitis" TYPE TIMESTAMPTZ(3) USING "bitis" AT TIME ZONE 'UTC';
