import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface Place {
  id: number;
  ad: string;
}

// Sıralama burada yapılır: veritabanının dil ayarına bağlı kalırsa Ç, İ, Ş ile başlayan adlar listenin sonuna düşebilir.
const byTurkishName = (a: Place, b: Place) => a.ad.localeCompare(b.ad, 'tr');

@Injectable()
export class LocationsService {
  constructor(private readonly db: DatabaseService) {}

  async cities() {
    const r = await this.db.query<Place>(`SELECT id, ad FROM "Il"`);
    return r.rows.sort(byTurkishName);
  }

  async districts(ilId: number) {
    const r = await this.db.query<Place>(`SELECT id, ad FROM "Ilce" WHERE "ilId" = $1`, [ilId]);
    return r.rows.sort(byTurkishName);
  }

  // Seçilen ilçedeki aktif dükkanlar. Sıralama: Gold, Silver, Ücretsiz; sonra ada göre.
  // Pasif işletmenin dükkanı görünmez. Hizmet filtresi verilirse yalnızca o hizmeti veren kuaförü olan dükkanlar.
  async shops(ilceId: number, service: string | null) {
    const r = await this.db.query(
      `SELECT d.id, d.ad, d.adres, d.telefon,
              i.ad AS "isletmeAd", p.kod AS plan, p.ad AS "planAd", p.siralama,
              (SELECT COUNT(*)::int FROM "Stylist" s
                WHERE s."dukkanId" = d.id AND s.aktif AND s."deletedAt" IS NULL) AS "kuaforSayisi"
       FROM "Dukkan" d
       JOIN "Isletme" i ON i.id = d."isletmeId"
       JOIN "Plan" p ON p.kod = i."planKod"
       WHERE d."ilceId" = $1 AND d.aktif AND d."deletedAt" IS NULL AND i.durum = 'AKTIF'
         AND ($2::text IS NULL OR EXISTS (
           SELECT 1 FROM "Stylist" s
             JOIN "Service" sv ON sv."stylistId" = s.id
            WHERE s."dukkanId" = d.id AND s.aktif AND s."deletedAt" IS NULL
              AND sv.aktif AND sv."deletedAt" IS NULL
              AND sv.ad ILIKE '%' || $2 || '%'))
       ORDER BY p.siralama, d.ad`,
      [ilceId, service],
    );
    return r.rows;
  }
}
