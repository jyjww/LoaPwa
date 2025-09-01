import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.get<string>('JWT_SECRET') ?? 'supersecret',
      ignoreExpiration: false,
    });
    // console.log('[JwtStrategy] using secret:', cfg.get('JWT_SECRET'));
  }

  async validate(payload: any) {
    // console.log('validate() payload:', payload);
    return { id: payload.sub, email: payload.email };
  }
}
