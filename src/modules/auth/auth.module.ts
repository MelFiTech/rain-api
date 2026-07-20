import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthService } from './auth.service';
import { AuthTokenService, JwtStrategy } from './jwt.strategy';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthGuard } from './platform-auth.guard';

@Module({
  imports: [
    NotificationsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') ?? 'rain-dev-jwt-secret',
        signOptions: {
          expiresIn: 60 * 60 * 24,
        },
      }),
    }),
  ],
  controllers: [PlatformAuthController],
  providers: [AuthService, JwtStrategy, AuthTokenService, PlatformAuthGuard],
  exports: [AuthService, PlatformAuthGuard, JwtModule],
})
export class AuthModule {}
