import { Injectable } from '@nestjs/common';
import { audit } from '../common/audit';
import { DatabaseService } from '../database/database.service';
import { UpdateHavaleDto } from './settings.dto';

export interface HavaleAyar {
  banka: string;
  alici: string;
  iban: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly db: DatabaseService) {}

  // Havale bilgisi tanımlı değilse null döner.
  async getHavale(): Promise<HavaleAyar | null> {
    const r = await this.db.query<{ deger: HavaleAyar }>(
      `SELECT deger FROM "Ayar" WHERE anahtar = 'havale'`,
    );
    return r.rows[0]?.deger ?? null;
  }

  // Güncelleme denetim kaydına yazılır (önceki ve yeni değer).
  async setHavale(adminId: number, dto: UpdateHavaleDto): Promise<HavaleAyar> {
    const yeni: HavaleAyar = {
      banka: dto.banka.trim(),
      alici: dto.alici.trim(),
      iban: dto.iban.replace(/\s+/g, '').toUpperCase(),
    };
    return this.db.transaction(async (client) => {
      const sql = (t: string, p?: unknown[]) => client.query(t, p);
      const eski = await sql(`SELECT deger FROM "Ayar" WHERE anahtar = 'havale' FOR UPDATE`);
      await sql(
        `INSERT INTO "Ayar" (anahtar, deger, "updatedAt") VALUES ('havale', $1, now())
         ON CONFLICT (anahtar) DO UPDATE SET deger = EXCLUDED.deger, "updatedAt" = now()`,
        [yeni],
      );
      await audit(sql, adminId, 'AYAR_HAVALE', 'Ayar', 'havale', eski.rows[0]?.deger ?? null, yeni);
      return yeni;
    });
  }
}
