import { Module } from '@nestjs/common';
import { OwnerServicesController, OwnerStylistsController, StylistsController } from './stylists.controller';
import { StylistsService } from './stylists.service';

@Module({
  controllers: [StylistsController, OwnerStylistsController, OwnerServicesController],
  providers: [StylistsService],
  exports: [StylistsService],
})
export class StylistsModule {}
