import { jwtSecret } from '@config/env';
import { UserService } from '@modules/user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor( private readonly userService: UserService,) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret!,
    });
  }

  async validate(payload: any) {

      const user = await this.userService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return payload;
  }
}
