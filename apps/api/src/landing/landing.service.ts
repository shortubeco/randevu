import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { VISIBLE_STYLIST_WHERE } from '../common/ownership';

interface RatedRow {
  id: number;
  ad: string;
  soyad: string;
  photoUrl: string | null;
  bio: string | null;
  dukkanAd: string;
  isletmeAd: string;
  ilId: number;
  ilAd: string;
  ilceAd: string;
  ortalama: number;
  adet: number;
}

export interface LandingStylist {
  id: number;
  ad: string;
  soyadKisa: string;
  photoUrl: string | null;
  bio: string | null;
  dukkanAd: string;
  isletmeAd: string;
  ilAd: string;
  ilceAd: string;
  ortalama: number;
  adet: number;
}

const TOP_COUNT = 10;
const PER_CITY = 5;
// Listeye girmek için en az değerlendirme sayısı (tek yüksek puan sıralamayı bozmasın).
const MIN_REVIEWS = 3;
// Landing'de gösterilen şehirler, bu sırayla.
const CITY_NAMES = ['İstanbul', 'İzmir', 'Ankara'];

function toLanding(r: RatedRow): LandingStylist {
  return {
    id: r.id,
    ad: r.ad,
    soyadKisa: r.soyad.charAt(0),
    photoUrl: r.photoUrl,
    bio: r.bio,
    dukkanAd: r.dukkanAd,
    isletmeAd: r.isletmeAd,
    ilAd: r.ilAd,
    ilceAd: r.ilceAd,
    ortalama: r.ortalama,
    adet: r.adet,
  };
}

// Landing sayfası verisi. Yalnızca en az bir değerlendirmesi olan, görünür (aktif) kuaförler.
// Puana göre sıralama; eşitlikte değerlendirme sayısı ve ada göre.
@Injectable()
export class LandingService {
  constructor(private readonly db: DatabaseService) {}

  async landing() {
    const [rows, stats] = await Promise.all([this.ratedStylists(), this.stats()]);

    // Sabit üç şehir; her şehirde kendi en yüksek puanlı kuaförleri.
    const cities = CITY_NAMES.map((ilAd) => ({
      ilAd,
      stylists: rows
        .filter((r) => r.ilAd === ilAd)
        .slice(0, PER_CITY)
        .map(toLanding),
    }));

    return {
      stats,
      topStylists: rows.slice(0, TOP_COUNT).map(toLanding),
      cities,
    };
  }

  private async ratedStylists(): Promise<RatedRow[]> {
    const r = await this.db.query<RatedRow>(
      `SELECT s.id, u.ad, u.soyad, s."photoUrl", s.bio,
              d.ad AS "dukkanAd", i.ad AS "isletmeAd",
              il.id AS "ilId", il.ad AS "ilAd", ilce.ad AS "ilceAd",
              ROUND(AVG(rv.puan), 1)::float8 AS ortalama,
              COUNT(rv.id)::int AS adet
       FROM "Review" rv
         JOIN "Stylist" s ON s.id = rv."stylistId"
         JOIN "User" u ON u.id = s."userId"
         JOIN "Dukkan" d ON d.id = s."dukkanId"
         JOIN "Isletme" i ON i.id = d."isletmeId"
         JOIN "Il" il ON il.id = d."ilId"
         JOIN "Ilce" ilce ON ilce.id = d."ilceId"
       WHERE ${VISIBLE_STYLIST_WHERE}
       GROUP BY s.id, u.ad, u.soyad, s."photoUrl", s.bio, d.ad, i.ad, il.id, il.ad, ilce.ad
       HAVING COUNT(rv.id) >= ${MIN_REVIEWS}
       ORDER BY ortalama DESC, adet DESC, u.ad
       LIMIT 500`,
    );
    return r.rows;
  }

  private async stats() {
    const r = await this.db.query<{ isletme: number; kuafor: number; degerlendirme: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM "Isletme" WHERE durum = 'AKTIF') AS isletme,
         (SELECT COUNT(*)::int FROM "Stylist" s
            JOIN "Dukkan" d ON d.id = s."dukkanId"
            JOIN "Isletme" i ON i.id = d."isletmeId"
           WHERE ${VISIBLE_STYLIST_WHERE}) AS kuafor,
         (SELECT COUNT(*)::int FROM "Review") AS degerlendirme`,
    );
    return r.rows[0];
  }
}
