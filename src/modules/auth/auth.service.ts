import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { generateId } from '../../common/utils/ids';
import type { UserEntity } from '../../domain/types';
import {
  InstitutionRepository,
  LoginSessionRepository,
  UserRepository,
} from '../../persistence';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthTokenService } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly institutions: InstitutionRepository,
    private readonly loginSessions: LoginSessionRepository,
    private readonly tokens: AuthTokenService,
    private readonly notifications: NotificationsService,
  ) {}

  async login(
    email: string,
    password: string,
    meta?: { device?: string; ipAddress?: string },
  ): Promise<
    | {
        success: true;
        session: {
          user: Awaited<ReturnType<AuthService['mapUser']>>;
          token: string;
          expiresAt: string;
        };
      }
    | { success: false; error: string }
  > {
    if (!email?.trim() || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const user = await this.users.findByEmail(email);
    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password. Please try again.',
      };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return {
        success: false,
        error: 'Invalid email or password. Please try again.',
      };
    }

    const institution = await this.institutions.findById(user.institutionId);
    if (!institution) {
      return { success: false, error: 'Institution not found.' };
    }

    const sessionId = generateId('sess');
    await this.loginSessions.save({
      id: sessionId,
      userId: user.id,
      institutionId: user.institutionId,
      device: meta?.device ?? 'Web browser',
      location: 'Nigeria',
      ipAddress: meta?.ipAddress ?? '—',
      lastActiveAt: new Date().toISOString(),
      current: true,
      tokenId: sessionId,
    });

    await this.loginSessions.markOthersNotCurrent(user.id, sessionId);

    const { token, expiresAt } = this.tokens.sign(user, sessionId);

    await this.notifications.add(
      institution.id,
      'New sign-in',
      `${user.email} signed in from ${meta?.device ?? 'Web browser'}.`,
    );

    const mapped = await this.mapUser(user);

    return {
      success: true,
      session: {
        user: mapped,
        token,
        expiresAt,
      },
    };
  }

  async logoutSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.loginSessions.findById(sessionId);
    if (session?.userId === userId) {
      await this.loginSessions.delete(sessionId);
    }
  }

  async mapUser(user: UserEntity) {
    const institution = await this.institutions.findById(user.institutionId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      institution: institution
        ? {
            id: institution.id,
            name: institution.name,
            email: institution.email,
          }
        : null,
    };
  }
}
