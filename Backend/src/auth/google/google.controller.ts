import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoogleService } from './google.service';

@Controller('auth/google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // Google 로그인 리다이렉트
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res() res) {
    const { user, token } = await this.googleService.handleGoogleLogin(req.user);

    // ✅ 프론트엔드 리다이렉트 (JWT 전달)
    return res.redirect(`${process.env.FRONTEND_URL}/login/success?token=${token}`);
  }
}
