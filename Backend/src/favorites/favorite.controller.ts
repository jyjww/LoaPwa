// src/favorites/favorites.controller.ts

import { Controller, Get, Post, Delete, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorite.service';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  findAll(@Req() req) {
    return this.favoritesService.findAllByUser(req.user.id);
  }

  @Post()
  create(@Req() req, @Body() dto: CreateFavoriteDto) {
    return this.favoritesService.create(req.user.id, dto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.favoritesService.remove(req.user.id, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() body: { targetPrice: number }) {
    return this.favoritesService.updateTargetPrice(req.user.id, id, body.targetPrice);
  }

  @Patch(':id/alarm')
  async updateAlarm(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { isAlerted: boolean; targetPrice: number },
  ) {
    return this.favoritesService.updateFavoriteAlarm(req.user.id, id, body);
  }
}
