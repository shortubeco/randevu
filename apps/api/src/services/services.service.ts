import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';

// fiyat NUMERIC olduğu için pg onu string döndürür; float'a çeviriyoruz.
const SERVICE_COLUMNS = `id, ad, "sureDk", fiyat::float8 AS fiyat, aktif`;

@Injectable()
export class ServicesService {
  constructor(private readonly db: DatabaseService) {}

  async listActive() {
    const r = await this.db.query(
      `SELECT ${SERVICE_COLUMNS} FROM "Service"
       WHERE "deletedAt" IS NULL AND aktif = true ORDER BY ad`,
    );
    return r.rows;
  }

  async listAll() {
    const r = await this.db.query(
      `SELECT ${SERVICE_COLUMNS} FROM "Service" WHERE "deletedAt" IS NULL ORDER BY ad`,
    );
    return r.rows;
  }

  async create(dto: CreateServiceDto) {
    const r = await this.db.query(
      `INSERT INTO "Service" (ad, "sureDk", fiyat, aktif)
       VALUES ($1, $2, $3, true)
       RETURNING ${SERVICE_COLUMNS}`,
      [dto.ad, dto.sureDk, dto.fiyat],
    );
    return r.rows[0];
  }

  async update(id: number, dto: UpdateServiceDto) {
    const r = await this.db.query(
      `UPDATE "Service" SET
         ad = COALESCE($2, ad),
         "sureDk" = COALESCE($3, "sureDk"),
         fiyat = COALESCE($4, fiyat),
         aktif = COALESCE($5, aktif)
       WHERE id = $1 AND "deletedAt" IS NULL
       RETURNING ${SERVICE_COLUMNS}`,
      [id, dto.ad ?? null, dto.sureDk ?? null, dto.fiyat ?? null, dto.aktif ?? null],
    );
    if (!r.rows[0]) throw new NotFoundException('Hizmet bulunamadı');
    return r.rows[0];
  }

  // Soft delete: geçmiş randevular bozulmasın diye kayıt silinmez, işaretlenir.
  async remove(id: number) {
    const r = await this.db.query(
      `UPDATE "Service" SET "deletedAt" = now(), aktif = false
       WHERE id = $1 AND "deletedAt" IS NULL RETURNING id`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException('Hizmet bulunamadı');
    return { ok: true };
  }
}
