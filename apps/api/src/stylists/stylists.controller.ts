import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import {
  AdminUpdateStylistDto,
  AssignStylistServicesDto,
  CreateStylistDto,
  UpdateStylistProfileDto,
} from './stylists.dto';
import { StylistsService } from './stylists.service';

// Giriş yapmış herkes aktif kuaförleri görebilir.
@Controller('stylists')
export class StylistsController {
  constructor(private readonly stylists: StylistsService) {}

  @Get()
  list() {
    return this.stylists.listActive();
  }

  // "me" rotaları ":id"den ÖNCE tanımlanmalı, yoksa "me" id sanılır.
  @Get('me')
  @Roles(Role.KUAFOR)
  me(@CurrentUser() user: AuthUser) {
    return this.stylists.findByUserId(user.sub);
  }

  @Patch('me')
  @Roles(Role.KUAFOR)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateStylistProfileDto) {
    return this.stylists.updateOwnProfile(user.sub, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stylists.findOneActive(id);
  }

  @Get(':id/services')
  async services(@Param('id', ParseIntPipe) id: number) {
    await this.stylists.findOneActive(id);
    return this.stylists.servicesOf(id);
  }
}

// Kuaför yönetimi yalnızca ADMIN.
@Controller('admin/stylists')
@Roles(Role.ADMIN)
export class AdminStylistsController {
  constructor(private readonly stylists: StylistsService) {}

  @Get()
  listAll() {
    return this.stylists.listAll();
  }

  @Post()
  create(@Body() dto: CreateStylistDto) {
    return this.stylists.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stylists.findAdmin(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminUpdateStylistDto) {
    return this.stylists.adminUpdate(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stylists.remove(id);
  }

  @Get(':id/services')
  services(@Param('id', ParseIntPipe) id: number) {
    return this.stylists.adminServicesOf(id);
  }

  @Put(':id/services')
  assignServices(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignStylistServicesDto,
  ) {
    return this.stylists.assignServices(id, dto);
  }
}
