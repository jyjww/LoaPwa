import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { GoogleService } from './google/google.service';
import { GoogleAuthGuard } from './google/google.guard';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService,
  ) {}

  // ✅ 구글 로그인 시작 (프론트에서 /auth/google 호출하면 구글로 리다이렉트)
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    // 여기는 구글 로그인 리다이렉트로 이동만 함
  }

  // ✅ 구글 로그인 콜백
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as any; // GoogleStrategy에서 넣어준 값
    const { token } = await this.googleService.handleGoogleLogin(profile);

    // 🔑 JWT 발급 후 프론트로 리다이렉트 (query string으로 전달)
    return res.redirect(`${process.env.FRONTEND_URL}/login/success?token=${token}`);
  }

  // ✅ JWT 토큰으로 유저 정보 확인
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return req.user; // passport-jwt에서 넣어주는 payload (sub, email 등)
  }
}
