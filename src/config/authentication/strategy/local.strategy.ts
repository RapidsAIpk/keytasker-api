import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@modules/auth/auth.service';
import { LoginDto } from '@modules/auth/dto/login.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

async validate(email: string, password: string): Promise<any> {
  try {
    let loginDto: LoginDto = {
      email,
      password,
    };

    const user = await this.authService.validateUser(loginDto);
    return user;
  } catch (error) {
    // Re-throw UnauthorizedException with original message
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    throw new UnauthorizedException('Invalid credentials');
  }
}
}