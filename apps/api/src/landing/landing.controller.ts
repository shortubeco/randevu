import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { LandingService } from './landing.service';

// Landing sayfası için herkese açık özet: istatistikler, en iyi kuaförler, şehir bazında en iyiler.
@Controller('landing')
export class LandingController {
  constructor(private readonly landing: LandingService) {}

  @Public()
  @Get()
  get() {
    return this.landing.landing();
  }
}
