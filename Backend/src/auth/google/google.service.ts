import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleService {
  constructor(private readonly authService: AuthService) {}

  async handleGoogleLogin(profile: any) {
    let user = await this.authService.validateUserByEmail(profile.email);

    if (!user) {
      user = await this.authService.createUser({
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        provider: 'google',
      });
    }

    const { accessToken, refreshToken } = await this.authService.generateTokens(user);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}
