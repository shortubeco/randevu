import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Role } from './roles.enum';

export interface AccountRow {
  id: number;
  rol: Role;
  sifreDegismeli: boolean;
  // Kullanıcının bağlı olduğu işletmenin durumu. Müşteri ve platform admininde null.
  isletmeDurum: 'ONAY_BEKLIYOR' | 'AKTIF' | 'PASIF' | null;
}

@Injectable()
export class AccountService {
  constructor(private readonly db: DatabaseService) {}

  // Sahip için kendi işletmesi, kuaför için bağlı olduğu dükkanın işletmesi.
  async load(userId: number): Promise<AccountRow | null> {
    const r = await this.db.query<AccountRow>(
      `SELECT u.id, u.rol, u."sifreDegismeli",
              COALESCE(
                (SELECT i.durum FROM "Isletme" i WHERE i."sahipId" = u.id),
                (SELECT i.durum FROM "Stylist" s
                   JOIN "Dukkan" d ON d.id = s."dukkanId"
                   JOIN "Isletme" i ON i.id = d."isletmeId"
                  WHERE s."userId" = u.id AND s."deletedAt" IS NULL)
              ) AS "isletmeDurum"
       FROM "User" u
       WHERE u.id = $1 AND u."deletedAt" IS NULL`,
      [userId],
    );
    return r.rows[0] ?? null;
  }
}

// Müşteri ve platform admini dışındaki hesaplar, bağlı işletme aktif değilse giremez.
export function assertIsletmeAktif(acc: AccountRow): void {
  if (acc.rol === Role.MUSTERI || acc.rol === Role.PLATFORM_ADMIN) return;
  if (acc.isletmeDurum === 'AKTIF') return;
  if (acc.isletmeDurum === 'ONAY_BEKLIYOR') {
    throw new ForbiddenException({
      code: 'ISLETME_ONAY_BEKLIYOR',
      message: 'Hesabınız onay bekliyor. Onaylandıktan sonra giriş yapabilirsiniz.',
    });
  }
  throw new ForbiddenException({
    code: 'ISLETME_PASIF',
    message: 'Ücretinizi yatırın. Hesabınız pasif durumda.',
  });
}
