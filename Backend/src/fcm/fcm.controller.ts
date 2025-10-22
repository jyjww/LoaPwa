import { Controller, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { FcmService } from './fcm.service';
import { PrincipalResolver } from '@/auth/principal.resolver';

@Controller('fcm')
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Post('register')
  @UseGuards(PrincipalResolver)
  async register(@Req() req, @Body('token') token: string) {
    // 익명 사용자와 일반 사용자 모두 허용
    const userId = req.principal.id;
    if (!userId) throw new Error('User ID required');

    await this.fcmService.registerToken(userId, token);
    return { ok: true };
  }

  @Post('unregister')
  @UseGuards(PrincipalResolver)
  async unregister(@Req() req, @Body('token') token: string) {
    await this.fcmService.unregisterToken(token);
    return { ok: true };
  }
}
