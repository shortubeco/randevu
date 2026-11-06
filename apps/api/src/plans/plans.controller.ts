import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { DatabaseService } from '../database/database.service';

// Landing page ve kayıt ekranı için planlar. Herkese açık.
@Controller('plans')
export class PlansController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get()
  async list() {
    const r = await this.db.query(
      `SELECT kod, ad, siralama, "maxDukkan", "maxKuaforDukkan", "maxHizmetKuafor",
              "aylikUcret"::float8 AS "aylikUcret"
       FROM "Plan" ORDER BY siralama`,
    );
    return r.rows;
  }
}
