import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import {
  CreateServiceDto,
  CreateStylistDto,
  ListStylistsQuery,
  UpdateOwnStylistDto,
  UpdateServiceDto,
  UpdateStylistDto,
} from './stylists.dto';
import { StylistsService } from './stylists.service';

// Müşteri (giriş yapmış herkes): dükkanın aktif kuaförleri, kuaförün aktif hizmetleri.
// "me" rotaları ":id" rotalarından ÖNCE tanımlı olmalı.
@Controller('stylists')
export class StylistsController {
  constructor(private readonly stylists: StylistsService) {}

  @Get()
  list(@Query() q: ListStylistsQuery) {
    return this.stylists.listVisibleByShop(q.shopId);
  }

  @Get('me')
  @Roles(Role.KUAFOR)
  me(@CurrentUser() user: AuthUser) {
    return this.stylists.findOwnProfile(user.sub);
  }

  @Patch('me')
  @Roles(Role.KUAFOR)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateOwnStylistDto) {
    return this.stylists.updateOwnProfile(user.sub, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stylists.findVisible(id);
  }

  @Get(':id/services')
  services(@Param('id', ParseIntPipe) id: number) {
    return this.stylists.servicesVisible(id);
  }
}

// İşletme sahibi: kuaförler ve hizmetleri.
@Controller('business/stylists')
@Roles(Role.ISLETME_SAHIBI)
export class OwnerStylistsController {
  constructor(private readonly stylists: StylistsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.stylists.listOwned(user.sub);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStylistDto) {
    return this.stylists.createOwned(user.sub, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.stylists.findOwned(user.sub, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStylistDto,
  ) {
    return this.stylists.updateOwned(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.stylists.removeOwned(user.sub, id);
  }

  @Get(':id/services')
  services(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.stylists.listServicesOwned(user.sub, id);
  }

  @Post(':id/services')
  createService(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateServiceDto,
  ) {
    return this.stylists.createService(user.sub, id, dto);
  }
}

@Controller('business/services')
@Roles(Role.ISLETME_SAHIBI)
export class OwnerServicesController {
  constructor(private readonly stylists: StylistsService) {}

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.stylists.updateService(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.stylists.removeService(user.sub, id);
  }
}
