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

    // 익명 사용자 ID가 있으면 서버에서 검증
    if (anonId) {
      try {
        const anonUser = await this.anonUserService.findById(anonId);
        if (!anonUser) {
          // 서버에 존재하지 않는 익명 사용자 ID
          anonId = null;
        }
      } catch (error) {
        // 검증 실패 시 익명 사용자 ID 제거
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
