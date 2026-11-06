import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { pgCode, UNIQUE_VIOLATION } from '../common/pg-errors';
import { CreateReviewDto } from './reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly db: DatabaseService) {}

  // Müşteri yalnızca kendi tamamlanmış randevusunu, bir kez değerlendirebilir.
  async create(customerId: number, appointmentId: number, dto: CreateReviewDto) {
    const r = await this.db.query<{ status: string; stylistId: number }>(
      `SELECT status, "stylistId" FROM "Appointment"
       WHERE id = $1 AND "customerId" = $2 AND "deletedAt" IS NULL`,
      [appointmentId, customerId],
    );
    if (!r.rows[0]) throw new NotFoundException('Randevu bulunamadı');
    if (r.rows[0].status !== 'TAMAMLANDI') {
      throw new BadRequestException('Yalnızca tamamlanan randevu değerlendirilebilir');
    }

    try {
      const ins = await this.db.query(
        `INSERT INTO "Review" ("appointmentId", "userId", "stylistId", puan, yorum)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, puan, yorum, "createdAt"`,
        [appointmentId, customerId, r.rows[0].stylistId, dto.puan, dto.yorum?.trim() || null],
      );
      return ins.rows[0];
    } catch (err) {
      if (pgCode(err) === UNIQUE_VIOLATION) {
        throw new ConflictException('Bu randevu zaten değerlendirildi');
      }
      throw err;
    }
  }

  // Kuaförün değerlendirmeleri ve ortalaması. Müşteri adı kısaltılır (Ad S.).
  async forStylist(stylistId: number) {
    const [stats, rows] = await Promise.all([
      this.db.query<{ adet: number; ortalama: number | null }>(
        `SELECT COUNT(*)::int AS adet, ROUND(AVG(r.puan), 1)::float8 AS ortalama
         FROM "Review" r WHERE r."stylistId" = $1`,
        [stylistId],
      ),
      this.db.query(
        `SELECT r.id, r.puan, r.yorum, r."createdAt", u.ad, u.soyad
         FROM "Review" r
         JOIN "User" u ON u.id = r."userId"
         WHERE r."stylistId" = $1
         ORDER BY r."createdAt" DESC
         LIMIT 100`,
        [stylistId],
      ),
    ]);

    return {
      adet: stats.rows[0].adet,
      ortalama: stats.rows[0].ortalama,
      yorumlar: rows.rows.map((x) => ({
        id: x.id,
        puan: x.puan,
        yorum: x.yorum,
        createdAt: x.createdAt,
        musteri: `${x.ad} ${x.soyad.charAt(0)}.`,
      })),
    };
  }
}
