import { Module } from '@nestjs/common';
import { AdminStylistsController, StylistsController } from './stylists.controller';
import { StylistsService } from './stylists.service';

@Module({
  controllers: [StylistsController, AdminStylistsController],
  providers: [StylistsService],
  exports: [StylistsService],
})
export class StylistsModule {}
