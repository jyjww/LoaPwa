import { Controller, Post, Delete, Body, Req } from '@nestjs/common';
import { AnonFcmService } from './anon-fcm.service';
import { PrincipalResolver } from '@/auth/principal.resolver';

@Controller('anon/fcm')
export class AnonFcmController {
  constructor(private readonly anonFcmService: AnonFcmService) {}

  @Post('register')
  async register(@Req() req, @Body('token') token: string) {
    // PrincipalResolver에서 설정한 익명 사용자 ID 사용
    const anonId = req.principal?.id;

    if (!anonId || req.principal?.type !== 'anon') {
      throw new Error('Anonymous user ID not found');
    }

    await this.anonFcmService.registerToken(anonId, token);
    return { success: true };
  }

  @Post('unregister')
  async unregister(@Body('token') token: string) {
    await this.anonFcmService.unregisterToken(token);
    return { success: true };
  }
}
