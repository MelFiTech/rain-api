import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../../common/decorators/auth.decorators';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import type { UserEntity } from '../../domain/types';
import { AuthService } from './auth.service';
import type { JwtPayload } from './jwt.strategy';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

@Controller('platform/auth')
export class PlatformAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    const result = await this.auth.login(body.email, body.password);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return result;
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: UserEntity,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;
    if (token) {
      const payload = this.jwt.decode(token) as JwtPayload | null;
      if (payload?.sid) {
        await this.auth.logoutSession(payload.sid, user.id);
      }
    }
    return { success: true };
  }

  @Get('me')
  async me(@CurrentUser() user: UserEntity) {
    return { user: await this.auth.mapUser(user) };
  }
}
