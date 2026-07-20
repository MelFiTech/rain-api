import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { API_KEY_PREFIX, LOW_BALANCE_THRESHOLD } from '../../common/constants';
import { applyApiKeyPlaintext } from '../../common/crypto/institution-api-key';
import { generateId } from '../../common/utils/ids';
import { assertPasswordPolicy } from '../../common/validation/password-policy';
import type {
  InstitutionEntity,
  NotificationPreferences,
  UserEntity,
} from '../../domain/types';
import { InstitutionRepository, UserRepository } from '../../persistence';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailVerificationResults: true,
  emailEarnings: true,
  emailTeamActivity: true,
  emailLowBalance: true,
  inAppNotifications: true,
};

@Injectable()
export class InstitutionProvisioningService {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly users: UserRepository,
    private readonly config: ConfigService,
  ) {}

  async createInstitution(input: {
    name: string;
    email: string;
    contactName?: string;
  }): Promise<{ institution: InstitutionEntity; apiKeyPlain: string }> {
    const apiKeyPlain = `${API_KEY_PREFIX}${randomBytes(16).toString('hex')}`;
    const institution: InstitutionEntity = {
      id: generateId('inst'),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      contactName: input.contactName?.trim(),
      walletBalance: 0,
      lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
      apiKeyHash: '',
      apiKeyPrefix: '',
      apiKeyCreatedAt: new Date().toISOString(),
      notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      settlementBank: null,
    };
    const encryptionSecret = this.config.get<string>(
      'jwt.secret',
      'rain-dev-jwt-secret-change-me',
    );
    await applyApiKeyPlaintext(institution, apiKeyPlain, encryptionSecret);

    await this.institutions.save(institution);
    return { institution, apiKeyPlain };
  }

  async createUser(input: {
    institutionId: string;
    email: string;
    name: string;
    role: UserEntity['role'];
    password: string;
  }): Promise<UserEntity> {
    assertPasswordPolicy(input.password);
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new BadRequestException('An account with this email already exists.');
    }

    const user: UserEntity = {
      id: generateId('usr'),
      institutionId: input.institutionId,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 10),
      isPlatformAdmin: false,
    };
    await this.users.save(user);
    return user;
  }

  async createUserWithPasswordHash(input: {
    institutionId: string;
    email: string;
    name: string;
    role: UserEntity['role'];
    passwordHash: string;
    isPlatformAdmin?: boolean;
  }): Promise<UserEntity> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new BadRequestException('An account with this email already exists.');
    }

    const user: UserEntity = {
      id: generateId('usr'),
      institutionId: input.institutionId,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      passwordHash: input.passwordHash,
      isPlatformAdmin: input.isPlatformAdmin ?? false,
    };
    await this.users.save(user);
    return user;
  }
}
