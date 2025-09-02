import { Controller, Post, Delete, Body, Param } from '@nestjs/common';
import { FcmService } from './fcm.service';

@Controller('fcm')
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Post('register')
  async register(@Body() body: { userId: string; token: string }) {
    return this.fcmService.registerToken(body.userId, body.token);
  }

  @Delete(':token')
  async unregister(@Param('token') token: string) {
    return this.fcmService.unregisterToken(token);
  }
}
