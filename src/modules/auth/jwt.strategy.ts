import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import {
  InstitutionRepository,
  LoginSessionRepository,
  UserRepository,
} from '../../persistence';
import type { UserEntity } from '../../domain/types';

export interface JwtPayload {
  sub: string;
  institutionId: string;
  email: string;
  sid: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly loginSessions: LoginSessionRepository,
    private readonly users: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret', 'rain-dev-jwt-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<UserEntity | null> {
    const session = await this.loginSessions.findById(payload.sid);
    if (!session || session.userId !== payload.sub) return null;
    const user = await this.users.findById(payload.sub);
    if (!user || user.institutionId !== payload.institutionId) return null;
    session.lastActiveAt = new Date().toISOString();
    await this.loginSessions.save(session);
    return user;
  }
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(
    user: UserEntity,
    sessionId: string,
  ): { token: string; expiresAt: string } {
    const token = this.jwt.sign({
      sub: user.id,
      institutionId: user.institutionId,
      email: user.email,
      sid: sessionId,
    });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return { token, expiresAt };
  }
}
