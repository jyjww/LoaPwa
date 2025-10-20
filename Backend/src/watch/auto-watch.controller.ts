// src/watch/auto-watch.controller.ts
import { Controller, Post, Body, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AutoWatchService } from './auto-watch.service';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { AutoWatch } from './entities/auto-watch.entity';

@Controller('watch')
export class AutoWatchController {
  constructor(private svc: AutoWatchService) {}

  @UseGuards(JwtAuthGuard)
  @Get('auto/:itemKey')
  async getAuto(@Req() req: any, @Param('itemKey') itemKeyEncoded: string) {
    const userId = req.user?.sub || req.user?.id;
    const itemKey = decodeURIComponent(itemKeyEncoded);

    // ✅ row의 타입이 AutoWatch | null 로 확정됨
    const row: AutoWatch | null = await this.svc.find(userId, itemKey);

    return {
      enabled: !!row?.enabled,
      lastSeenAt: row?.last_seen_at ?? null,
      lastSnapshotAt: row?.last_snapshot_at ?? null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('auto')
  async setAuto(@Req() req: any, @Body() body: { itemKey: string; enabled: boolean }) {
    const userId = req.user?.sub || req.user?.id;
    return this.svc.upsert(userId, body.itemKey, body.enabled);
  }
}
