import { Controller, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { FcmService } from './fcm.service';
import { JwtAuthGuard } from '@/auth/jwt.guard';

@Controller('fcm')
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(@Req() req, @Body('token') token: string) {
    // userId를 바디로 받지 않고, 인증된 사용자에서 가져옴
    await this.fcmService.registerToken(req.user.id, token);
    return { ok: true };
  }

  @Post('unregister')
  @UseGuards(JwtAuthGuard)
  async unregister(@Req() req, @Body('token') token: string) {
    await this.fcmService.unregisterToken(token);
    return { ok: true };
  }
}
