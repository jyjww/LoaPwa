import { Controller, Post, Get, Body, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AnonUserService } from './anon.service';
import { v4 as uuidv4 } from 'uuid';

interface InitAnonRequest {
  anonId?: string;
}

@Controller('anon')
export class AnonController {
  constructor(private anonUserService: AnonUserService) {}

  @Post('init')
  async init(@Body() body: InitAnonRequest = {}, @Req() req: Request, @Res() res: Response) {
    // 먼저 쿠키에서 기존 anonId 확인
    let anonId = req.cookies?.anonId;

    // 쿠키에 anonId가 있고 유효한 UUID라면 그것을 사용
    if (anonId && this.isValidUUID(anonId)) {
      // 기존 사용자 정보 업데이트 (lastSeenAt 등)
      await this.anonUserService.upsert(anonId, {
        userAgent: req.get('User-Agent'),
        lastIp: req.ip,
      });

      return res.json({
        success: true,
        data: { anonId },
      });
    }

    // 요청 body에서 anonId 확인
    anonId = body?.anonId;

    // Validate anonId if provided
    if (anonId && !this.isValidUUID(anonId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_UUID', message: 'Invalid anonId format' },
      });
    }

    // Generate new UUID if not provided or invalid
    if (!anonId) {
      anonId = uuidv4();
    }

    // Upsert anon user with metadata
    await this.anonUserService.upsert(anonId, {
      userAgent: req.get('User-Agent'),
      lastIp: req.ip,
    });

    // Set cookie
    res.cookie('anonId', anonId, {
      path: '/',
      maxAge: 31536000 * 1000, // 1 year in milliseconds
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // Allow client-side access
    });

    return res.json({
      success: true,
      data: { anonId },
    });
  }

  @Get('ping')
  async ping(@Req() req: Request) {
    // This endpoint requires principal resolution (will be added via middleware)
    return {
      success: true,
      data: { message: 'pong' },
    };
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
