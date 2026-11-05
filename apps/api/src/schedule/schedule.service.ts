import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { hhmmToMinutes, WorkingRow } from '../scheduling/scheduling';
import { ReplaceWorkingHoursDto, TimeOffDto, WorkingDayDto } from './schedule.dto';

function validateDay(d: WorkingDayDto) {
  const start = hhmmToMinutes(d.baslangic);
  const end = hhmmToMinutes(d.bitis);
  if (end <= start) {
    throw new BadRequestException('Bitiş saati başlangıçtan sonra olmalı');
  }
  const hasMola = d.molaBaslangic !== undefined || d.molaBitis !== undefined;
  if (hasMola) {
    if (!d.molaBaslangic || !d.molaBitis) {
      throw new BadRequestException('Mola için başlangıç ve bitiş birlikte girilmeli');
    }
    const ms = hhmmToMinutes(d.molaBaslangic);
    const me = hhmmToMinutes(d.molaBitis);
    if (!(start < ms && ms < me && me < end)) {
      throw new BadRequestException('Mola çalışma saatleri içinde olmalı');
    }
  }
}

@Injectable()
export class ScheduleService {
  constructor(private readonly db: DatabaseService) {}

  async stylistIdOfUser(userId: number): Promise<number> {
    const r = await this.db.query<{ id: number }>(
      `SELECT id FROM "Stylist" WHERE "userId" = $1 AND "deletedAt" IS NULL`,
      [userId],
    );
    if (!r.rows[0]) throw new NotFoundException('Kuaför kaydı bulunamadı');
    return r.rows[0].id;
  }

  async assertStylist(stylistId: number) {
    const r = await this.db.query(
      `SELECT 1 FROM "Stylist" WHERE id = $1 AND "deletedAt" IS NULL`,
      [stylistId],
    );
    if (!r.rows[0]) throw new NotFoundException('Kuaför bulunamadı');
  }

  async getWorkingHours(stylistId: number): Promise<WorkingRow[]> {
    await this.assertStylist(stylistId);
    const r = await this.db.query<WorkingRow>(
      `SELECT gun, baslangic, bitis, "molaBaslangic", "molaBitis"
       FROM "WorkingHours" WHERE "stylistId" = $1 ORDER BY gun, baslangic`,
      [stylistId],
    );
    return r.rows;
  }

  // Haftalık çalışma saatlerini tamamen yeniden yazar.
  async replaceWorkingHours(stylistId: number, dto: ReplaceWorkingHoursDto) {
    dto.days.forEach(validateDay);
    await this.assertStylist(stylistId);

    return this.db.transaction(async (client) => {
      await client.query(`DELETE FROM "WorkingHours" WHERE "stylistId" = $1`, [stylistId]);
      for (const d of dto.days) {
        await client.query(
          `INSERT INTO "WorkingHours" ("stylistId", gun, baslangic, bitis, "molaBaslangic", "molaBitis")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [stylistId, d.gun, d.baslangic, d.bitis, d.molaBaslangic ?? null, d.molaBitis ?? null],
        );
      }
      return { ok: true, count: dto.days.length };
    });
  }

  async listTimeOff(stylistId: number) {
    await this.assertStylist(stylistId);
    const r = await this.db.query(
      `SELECT id, baslangic, bitis, sebep FROM "TimeOff"
       WHERE "stylistId" = $1 AND bitis > now() ORDER BY baslangic`,
      [stylistId],
    );
    return r.rows;
  }

  async addTimeOff(stylistId: number, dto: TimeOffDto) {
    const start = Date.parse(dto.baslangic);
    const end = Date.parse(dto.bitis);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      throw new BadRequestException('İzin bitişi başlangıçtan sonra olmalı');
    }
    await this.assertStylist(stylistId);
    const r = await this.db.query(
      `INSERT INTO "TimeOff" ("stylistId", baslangic, bitis, sebep)
       VALUES ($1, $2, $3, $4) RETURNING id, baslangic, bitis, sebep`,
      [stylistId, new Date(start), new Date(end), dto.sebep ?? null],
    );
    return r.rows[0];
  }

  async removeTimeOff(stylistId: number, id: number) {
    const r = await this.db.query(
      `DELETE FROM "TimeOff" WHERE id = $1 AND "stylistId" = $2 RETURNING id`,
      [id, stylistId],
    );
    if (!r.rows[0]) throw new NotFoundException('İzin kaydı bulunamadı');
    return { ok: true };
  }
}
