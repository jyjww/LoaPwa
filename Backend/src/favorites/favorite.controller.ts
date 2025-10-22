// src/favorites/favorites.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FavoritesService } from './favorite.service';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { PrincipalResolver } from '@/auth/principal.resolver';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { Principal } from '@shared/auth';

@Controller('favorites')
export class FavoritesController {
  private readonly logger = new Logger(FavoritesController.name);

  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @UseGuards(PrincipalResolver)
  findAll(@Req() req: any) {
    return this.favoritesService.findAllByPrincipal(req.principal);
  }

  @Post()
  @UseGuards(PrincipalResolver)
  create(@Req() req: any, @Body() dto: CreateFavoriteDto) {
    this.logger.debug(
      `create favorite: source=${dto.source}, itemId=${dto.itemId}, matchKey=${dto.matchKey}`,
    );
    return this.favoritesService.createByPrincipal(req.principal, dto);
  }

  @Delete(':id')
  @UseGuards(PrincipalResolver)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.favoritesService.removeByPrincipal(req.principal, id);
  }

  @Patch(':id')
  @UseGuards(PrincipalResolver)
  update(@Req() req: any, @Param('id') id: string, @Body() body: { targetPrice: number }) {
    // 익명 사용자와 일반 사용자 모두 허용
    if (req.principal.type === 'user') {
      return this.favoritesService.updateTargetPrice(req.principal.id!, id, body.targetPrice);
    } else if (req.principal.type === 'anon') {
      return this.favoritesService.updateTargetPriceForAnon(
        req.principal.id!,
        id,
        body.targetPrice,
      );
    } else {
      throw new Error('Invalid principal type');
    }
  }

  @Patch(':id/alarm')
  @UseGuards(PrincipalResolver)
  async updateAlarm(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { isAlerted: boolean; targetPrice: number },
  ) {
    // 익명 사용자와 일반 사용자 모두 허용
    if (req.principal.type === 'user') {
      return this.favoritesService.updateFavoriteAlarm(req.principal.id!, id, body);
    } else if (req.principal.type === 'anon') {
      return this.favoritesService.updateFavoriteAlarmForAnon(req.principal.id!, id, body);
    } else {
      throw new Error('Invalid principal type');
    }
  }
}
