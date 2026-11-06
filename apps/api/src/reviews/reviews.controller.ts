import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { assertStylistOwnedBy } from '../common/ownership';
import { DatabaseService } from '../database/database.service';
import { Sql } from '../scheduling/scheduling';
import { CreateReviewDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';

// Müşteri: randevusunu değerlendirir.
@Controller('appointments')
@Roles(Role.MUSTERI)
export class AppointmentReviewController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post(':id/review')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user.sub, id, dto);
  }
}

// Giriş yapmış herkes (müşteri uygulaması) kuaförün değerlendirmelerini görür.
@Controller('stylists')
export class StylistReviewController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':id/reviews')
  list(@Param('id', ParseIntPipe) id: number) {
    return this.reviews.forStylist(id);
  }
}

// İşletme sahibi: kendi kuaförlerinin değerlendirmeleri.
@Controller('business/stylists')
@Roles(Role.ISLETME_SAHIBI)
export class OwnerStylistReviewController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly db: DatabaseService,
  ) {}

  @Get(':id/reviews')
  async list(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const sql: Sql = (t, p) => this.db.query(t, p);
    await assertStylistOwnedBy(sql, id, user.sub);
    return this.reviews.forStylist(id);
  }
}
