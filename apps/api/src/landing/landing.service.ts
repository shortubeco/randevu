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

interface ReviewRow {
  id: number;
  puan: number;
  yorum: string;
  musteriAd: string;
  musteriSoyad: string;
  kuaforAd: string;
  kuaforSoyad: string;
  isletmeAd: string;
  ilceAd: string;
}

// Müşteri ve kuaför adı kısaltılmış gider; soyad, e-posta ve telefon herkese açık sayfaya çıkmaz.
export interface LandingReview {
  id: number;
  puan: number;
  yorum: string;
  musteriAd: string;
  musteriSoyadKisa: string;
  kuaforAd: string;
  kuaforSoyadKisa: string;
  isletmeAd: string;
  ilceAd: string;
}

const TOP_COUNT = 10;
const REVIEW_COUNT = 6;
// Aynı kuaförden tek yorum alındıktan sonra, aynı metinleri elemek için fazladan aday çekilir.
const REVIEW_CANDIDATES = 40;
// Bu puanın altındaki yorumlar tanıtım sayfasında gösterilmez.
const MIN_REVIEW_SCORE = 4;
// "İyi" gibi çok kısa yorumlar okuyucuya bir şey anlatmaz.
const MIN_REVIEW_LENGTH = 15;
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
    const [rows, stats, yorumlar] = await Promise.all([this.ratedStylists(), this.stats(), this.reviews()]);

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
      yorumlar,
    };
  }

  // En yeni yorumlar: yorum metni olan, yüksek puanlı; kuaför başına bir tane, aynı metin bir kez.
  private async reviews(): Promise<LandingReview[]> {
    const r = await this.db.query<ReviewRow>(
      `SELECT * FROM (
         SELECT DISTINCT ON (s.id)
                rv.id, rv.puan, TRIM(rv.yorum) AS yorum, rv."createdAt",
                m.ad AS "musteriAd", m.soyad AS "musteriSoyad",
                u.ad AS "kuaforAd", u.soyad AS "kuaforSoyad",
                i.ad AS "isletmeAd", ilce.ad AS "ilceAd"
         FROM "Review" rv
           JOIN "User" m ON m.id = rv."userId"
           JOIN "Stylist" s ON s.id = rv."stylistId"
           JOIN "User" u ON u.id = s."userId"
           JOIN "Dukkan" d ON d.id = s."dukkanId"
           JOIN "Isletme" i ON i.id = d."isletmeId"
           JOIN "Ilce" ilce ON ilce.id = d."ilceId"
         WHERE ${VISIBLE_STYLIST_WHERE}
           AND m."deletedAt" IS NULL
           AND rv.puan >= ${MIN_REVIEW_SCORE}
           AND LENGTH(TRIM(COALESCE(rv.yorum, ''))) >= ${MIN_REVIEW_LENGTH}
         ORDER BY s.id, rv."createdAt" DESC, rv.id DESC
       ) x
       ORDER BY x."createdAt" DESC, x.id DESC
       LIMIT ${REVIEW_CANDIDATES}`,
    );

    const seen = new Set<string>();
    const out: LandingReview[] = [];
    for (const row of r.rows) {
      const key = row.yorum.toLocaleLowerCase('tr-TR');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: row.id,
        puan: row.puan,
        yorum: row.yorum,
        musteriAd: row.musteriAd,
        musteriSoyadKisa: row.musteriSoyad.charAt(0),
        kuaforAd: row.kuaforAd,
        kuaforSoyadKisa: row.kuaforSoyad.charAt(0),
        isletmeAd: row.isletmeAd,
        ilceAd: row.ilceAd,
      });
      if (out.length === REVIEW_COUNT) break;
    }
    return out;
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
