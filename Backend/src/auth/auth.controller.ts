import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  Post,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { GoogleService } from './google/google.service';
import { GoogleAuthGuard } from './google/google.guard';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService,
    private readonly jwtService: JwtService,
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
    const { accessToken, refreshToken } = await this.googleService.handleGoogleLogin(profile);

    // ✅ RefreshToken은 httpOnly 쿠키로 내려주고,
    // ✅ AccessToken은 query string으로 전달
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/', // 필요 시 /auth/refresh 로 제한 가능
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    return res.redirect(`${process.env.FRONTEND_URL}/login/success?accessToken=${accessToken}`);
  }

  // ✅ JWT 토큰으로 유저 정보 확인
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return req.user; // passport-jwt에서 넣어주는 payload (sub, email 등)
  }

  // src/auth/auth.controller.ts
  @Post('login')
  async login(@Body() body: { email: string }, @Res() res: Response) {
    const user = await this.authService.validateUserByEmail(body.email);
    if (!user) throw new UnauthorizedException();

    const { accessToken, refreshToken } = await this.authService.generateTokens(user);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken });
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    // console.log('🍪 refresh_token from cookie:', req.cookies['refresh_token']);
    // if (!refreshToken) throw new UnauthorizedException();

    if (!refreshToken) {
      console.error('❌ no refresh token in cookie');
      return res.status(401).json({ message: 'No refresh token' });
    }
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.authService.validateUserByEmail(payload.email);
      if (!user) throw new UnauthorizedException();

      const { accessToken, refreshToken: newRefresh } = await this.authService.generateTokens(user);

      // 새로운 RefreshToken으로 갱신 (쿠키 교체)
      res.cookie('refresh_token', newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({ accessToken });
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
