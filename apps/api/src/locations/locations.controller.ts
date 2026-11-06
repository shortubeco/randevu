import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { LocationsService } from './locations.service';
import { ShopSearchQuery } from './locations.dto';

// İl ve ilçe listeleri kayıt ekranı için herkese açık.
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Public()
  @Get('cities')
  cities() {
    return this.locations.cities();
  }

  @Public()
  @Get('cities/:id/districts')
  districts(@Param('id', ParseIntPipe) id: number) {
    return this.locations.districts(id);
  }

  // Müşteri girişi gerekir. Yalnızca onaylı (AKTIF) işletmelerin dükkanları. Plana göre sıralı.
  @Get('districts/:id/shops')
  shops(@Param('id', ParseIntPipe) id: number, @Query() q: ShopSearchQuery) {
    return this.locations.shops(id, q.service ?? null);
  }
}
