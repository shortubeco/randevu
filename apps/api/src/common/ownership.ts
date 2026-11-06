import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { Sql } from '../scheduling/scheduling';

// Müşteriye görünür kuaför zinciri: kuaför, dükkan ve işletme aktif ve silinmemiş olmalı.
// Kullanım: FROM ${VISIBLE_STYLIST_FROM} ... WHERE ${VISIBLE_STYLIST_WHERE}
export const VISIBLE_STYLIST_FROM = `"Stylist" s
  JOIN "Dukkan" d ON d.id = s."dukkanId"
  JOIN "Isletme" i ON i.id = d."isletmeId"`;

export const VISIBLE_STYLIST_WHERE = `s.aktif AND s."deletedAt" IS NULL
  AND d.aktif AND d."deletedAt" IS NULL AND i.durum = 'AKTIF'`;

// Kullanıcının sahip olduğu işletme (yoksa 404).
export async function ownIsletmeId(sql: Sql, userId: number): Promise<number> {
  const r = await sql(`SELECT id FROM "Isletme" WHERE "sahipId" = $1`, [userId]);
  if (!r.rows[0]) throw new NotFoundException('İşletme bulunamadı');
  return r.rows[0].id;
}

// Kullanıcının kuaför kaydı (yoksa 404).
export async function stylistIdOfUser(sql: Sql, userId: number): Promise<number> {
  const r = await sql(`SELECT id FROM "Stylist" WHERE "userId" = $1 AND "deletedAt" IS NULL`, [userId]);
  if (!r.rows[0]) throw new NotFoundException('Kuaför kaydı bulunamadı');
  return r.rows[0].id;
}

// Kuaförün verilen işletme sahibine ait olduğunu doğrular. Başkasının kaydı 404 döner.
export async function assertStylistOwnedBy(sql: Sql, stylistId: number, ownerUserId: number): Promise<void> {
  const r = await sql(
    `SELECT 1 FROM "Stylist" s
       JOIN "Dukkan" d ON d.id = s."dukkanId"
       JOIN "Isletme" i ON i.id = d."isletmeId"
     WHERE s.id = $1 AND i."sahipId" = $2 AND s."deletedAt" IS NULL`,
    [stylistId, ownerUserId],
  );
  if (!r.rows[0]) throw new NotFoundException('Kuaför bulunamadı');
}

// Dükkanın sahibe ait olduğunu doğrular ve işletme id'sini döner.
export async function assertDukkanOwnedBy(sql: Sql, dukkanId: number, ownerUserId: number): Promise<number> {
  const r = await sql(
    `SELECT d."isletmeId" FROM "Dukkan" d
       JOIN "Isletme" i ON i.id = d."isletmeId"
     WHERE d.id = $1 AND i."sahipId" = $2 AND d."deletedAt" IS NULL`,
    [dukkanId, ownerUserId],
  );
  if (!r.rows[0]) throw new NotFoundException('Dükkan bulunamadı');
  return r.rows[0].isletmeId;
}

// Kuaför erişimi: kuaför yalnızca kendini; işletme sahibi kendi işletmesindeki kuaförleri.
export async function assertStylistAccess(sql: Sql, actor: AuthUser, stylistId: number): Promise<void> {
  if (actor.role === Role.KUAFOR) {
    if ((await stylistIdOfUser(sql, actor.sub)) !== stylistId) {
      throw new NotFoundException('Kuaför bulunamadı');
    }
    return;
  }
  if (actor.role === Role.ISLETME_SAHIBI) {
    await assertStylistOwnedBy(sql, stylistId, actor.sub);
    return;
  }
  throw new ForbiddenException();
}

// Aktörün kapsamındaki kuaför id'leri: kuaför için kendisi, sahip için işletmesinin tüm kuaförleri.
export async function scopeStylistIds(sql: Sql, actor: AuthUser): Promise<number[]> {
  if (actor.role === Role.KUAFOR) return [await stylistIdOfUser(sql, actor.sub)];
  const r = await sql(
    `SELECT s.id FROM "Stylist" s
       JOIN "Dukkan" d ON d.id = s."dukkanId"
       JOIN "Isletme" i ON i.id = d."isletmeId"
     WHERE i."sahipId" = $1 AND s."deletedAt" IS NULL`,
    [actor.sub],
  );
  return r.rows.map((x: { id: number }) => x.id);
}
