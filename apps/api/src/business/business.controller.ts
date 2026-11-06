import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { BusinessService } from './business.service';
import { CreateShopDto, UpdateShopDto } from './business.dto';

// İşletme sahibinin kendi işletmesi ve dükkanları.
@Controller('business')
@Roles(Role.ISLETME_SAHIBI)
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser) {
    return this.business.overview(user.sub);
  }

  @Get('shops')
  shops(@CurrentUser() user: AuthUser) {
    return this.business.listShops(user.sub);
  }

  @Post('shops')
  createShop(@CurrentUser() user: AuthUser, @Body() dto: CreateShopDto) {
    return this.business.createShop(user.sub, dto);
  }

  @Patch('shops/:id')
  updateShop(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShopDto,
  ) {
    return this.business.updateShop(user.sub, id, dto);
  }

  @Delete('shops/:id')
  removeShop(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.business.removeShop(user.sub, id);
  }
}
