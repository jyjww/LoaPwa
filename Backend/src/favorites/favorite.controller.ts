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
    // 기존 메서드 사용 (user 기반이므로 principal이 user일 때만)
    if (req.principal.type !== 'user') {
      throw new Error('Target price update requires user authentication');
    }
    return this.favoritesService.updateTargetPrice(req.principal.id!, id, body.targetPrice);
  }

  @Patch(':id/alarm')
  @UseGuards(PrincipalResolver)
  async updateAlarm(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { isAlerted: boolean; targetPrice: number },
  ) {
    // 기존 메서드 사용 (user 기반이므로 principal이 user일 때만)
    if (req.principal.type !== 'user') {
      throw new Error('Alarm update requires user authentication');
    }
    return this.favoritesService.updateFavoriteAlarm(req.principal.id!, id, body);
  }
}
