import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { Public } from './auth/decorators';

@Controller('health')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get()
  async health() {
    try {
      await this.db.query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch (err) {
      // Yanıta ayrıntı sızdırılmaz; sadece sunucu log'una yazılır.
      const e = err as NodeJS.ErrnoException;
      this.logger.error(`Veritabani baglanti hatasi: code=${e.code ?? '-'} message=${e.message}`);
      throw new ServiceUnavailableException({ status: 'error', database: 'error' });
    }
  }
}
