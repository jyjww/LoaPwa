import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Principal } from '@shared/auth';
import { AnonUserService } from '@/anon/anon.service';

declare global {
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

@Injectable()
export class PrincipalResolver implements NestMiddleware {
  constructor(private readonly anonUserService: AnonUserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // If user is authenticated (OAuth/JWT), use user principal
    if (req.user && (req.user as any).id) {
      req.principal = {
        type: 'user',
        id: (req.user as any).id,
      };
      return next();
    }

    // Try to get anonId from header or cookie
    let anonId = req.get('X-Anon-Id') || req.cookies?.anonId;

    // 익명 사용자 ID가 있으면 서버에서 검증 (없으면 자동 upsert — DB 초기화 후에도 쿠키 재활용)
    if (anonId) {
      try {
        const anonUser = await this.anonUserService.findById(anonId);
        if (!anonUser) {
          await this.anonUserService.upsert(anonId, {
            userAgent: req.get('User-Agent'),
            lastIp: req.ip,
          });
        }
      } catch (error) {
        anonId = null;
      }
    }

    req.principal = {
      type: 'anon',
      id: anonId || null,
    };

    next();
  }
}
