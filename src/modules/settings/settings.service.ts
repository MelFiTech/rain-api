import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  applyApiKeyPlaintext,
  readApiKeyPlaintext,
} from '../../common/crypto/institution-api-key';
import { generateOtpCode } from '../../common/utils/otp-code';
import { API_KEY_PREFIX } from '../../common/constants';
import { bankCodeForName, bankNameForCode } from '../../common/nigerian-banks';
import { generateId } from '../../common/utils/ids';
import { maskEmail } from '../../common/utils/masking';
import { assertPasswordPolicy } from '../../common/validation/password-policy';
import type {
  InstitutionEntity,
  NotificationPreferences,
  UserEntity,
  WebhookEndpointEntity,
  WebhookEventType,
} from '../../domain/types';
import {
  MonnifyApiClient,
  MonnifyApiError,
} from '../../providers/payments/monnify/monnify-api.client';
import { EmailService } from '../../providers/email/email.service';
import {
  InstitutionRepository,
  LoginSessionRepository,
  OtpRepository,
  UserRepository,
  WebhookRepository,
} from '../../persistence';

@Injectable()
export class SettingsService {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly webhooks: WebhookRepository,
    private readonly loginSessions: LoginSessionRepository,
    private readonly otp: OtpRepository,
    private readonly users: UserRepository,
    private readonly monnify: MonnifyApiClient,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private get encryptionSecret(): string {
    return this.config.get<string>('jwt.secret', 'rain-dev-jwt-secret-change-me');
  }

  private get nodeEnv(): string {
    return this.config.get<string>('nodeEnv', 'development');
  }

  async getSettings(institutionId: string, userId: string) {
    const institution = await this.institutions.findById(institutionId);
    if (!institution) throw new Error('Institution not found');

    const webhooks = (await this.webhooks.listForInstitution(institutionId)).map(
      (w) => this.toWebhookDto(w),
    );

    const sessions = (await this.loginSessions.listForUser(userId)).map((s) => ({
      id: s.id,
      device: s.device,
      location: s.location,
      ipAddress: s.ipAddress,
      lastActiveAt: s.lastActiveAt,
      current: s.current,
    }));

    return {
      profile: {
        id: institution.id,
        name: institution.name,
        email: institution.email,
        logoUrl: institution.logoUrl,
        phone: institution.phone,
        address: institution.address,
        contactName: institution.contactName,
      },
      notificationPreferences: institution.notificationPreferences,
      sessions,
      developer: {
        apiKey: {
          keyPrefix: institution.apiKeyPrefix,
          maskedKey: `${institution.apiKeyPrefix}…`,
          createdAt: institution.apiKeyCreatedAt,
          lastUsedAt: institution.apiKeyLastUsedAt,
        },
        webhooks,
      },
      settlementBank: institution.settlementBank,
    };
  }

  async updateProfile(institutionId: string, patch: Partial<InstitutionEntity>) {
    const institution = await this.institutions.findById(institutionId);
    if (!institution) return;
    Object.assign(institution, patch);
    await this.institutions.save(institution);
  }

  async updateNotifications(
    institutionId: string,
    prefs: NotificationPreferences,
  ) {
    const institution = await this.institutions.findById(institutionId);
    if (!institution) return;
    institution.notificationPreferences = prefs;
    await this.institutions.save(institution);
  }

  async getSettlementBank(institutionId: string) {
    const institution = await this.institutions.findById(institutionId);
    return institution?.settlementBank ?? null;
  }

  async setSettlementBank(
    institutionId: string,
    input: { accountName: string; bankName: string; accountNumber: string },
  ) {
    const institution = await this.institutions.findById(institutionId);
    if (!institution) throw new Error('Institution not found');
    const account = {
      ...input,
      updatedAt: new Date().toISOString(),
    };
    institution.settlementBank = account;
    await this.institutions.save(institution);
    return account;
  }

  async resolveAccountName(bankName: string, accountNumber: string) {
    const bankCode = bankCodeForName(bankName);
    if (!bankCode) {
      throw new BadRequestException('Unsupported bank for account validation.');
    }
    if (!this.monnify.isConfigured()) {
      throw new BadRequestException('Monnify is not configured for bank lookup.');
    }
    const normalizedAccount = accountNumber.replace(/\D/g, '');
    if (normalizedAccount.length !== 10) {
      throw new BadRequestException('Enter a valid 10-digit account number.');
    }
    try {
      const result = await this.monnify.validateBankAccount({
        accountNumber: normalizedAccount,
        bankCode,
      });
      if (!result.accountName?.trim()) {
        throw new BadRequestException('Could not resolve account name.');
      }
      if (result.bankCode && result.bankCode !== bankCode) {
        const actual =
          bankNameForCode(result.bankCode) ?? result.bankName ?? 'another bank';
        throw new BadRequestException(
          `This account is registered with ${actual}, not ${bankName}.`,
        );
      }
      const resolvedBankName =
        bankNameForCode(result.bankCode) ??
        (result.bankName?.trim() || bankName);
      return {
        accountName: result.accountName.trim(),
        bankName: resolvedBankName,
        accountNumber: result.accountNumber || normalizedAccount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message =
        error instanceof MonnifyApiError
          ? error.message
          : 'Could not validate account.';
      throw new BadRequestException(message);
    }
  }

  async createSettlementBankOtp(institutionId: string, userId: string) {
    const code = generateOtpCode(this.nodeEnv);
    const requestId = generateId('otp');
    await this.otp.save({
      id: requestId,
      institutionId,
      userId,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      purpose: 'settlement_bank_change',
    });
    const user = await this.users.findById(userId);
    const institution = await this.institutions.findById(institutionId);
    const deliveryEmail = user?.email ?? institution?.email ?? '';

    if (deliveryEmail) {
      await this.email.send(
        deliveryEmail,
        'Rain: settlement bank verification code',
        `Your verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request this change, contact Rain support immediately.`,
      );
    }

    return {
      requestId,
      deliveryHint: deliveryEmail,
    };
  }

  async confirmSettlementBankChange(input: {
    institutionId: string;
    requestId: string;
    otp: string;
    accountName: string;
    bankName: string;
    accountNumber: string;
  }) {
    const otp = await this.otp.findById(input.requestId);
    if (!otp || otp.institutionId !== input.institutionId) {
      throw new BadRequestException('Invalid or expired verification request.');
    }
    if (new Date(otp.expiresAt) < new Date()) {
      await this.otp.delete(input.requestId);
      throw new BadRequestException('Verification code expired.');
    }
    if (otp.code !== input.otp.trim()) {
      throw new BadRequestException('Incorrect verification code.');
    }
    await this.otp.delete(input.requestId);
    return this.setSettlementBank(input.institutionId, {
      accountName: input.accountName,
      bankName: input.bankName,
      accountNumber: input.accountNumber.replace(/\D/g, ''),
    });
  }

  async changePassword(
    user: UserEntity,
    currentPassword: string,
    newPassword: string,
  ) {
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    assertPasswordPolicy(newPassword);
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.users.save(user);
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.loginSessions.findById(sessionId);
    if (session?.userId === userId) {
      await this.loginSessions.delete(sessionId);
    }
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string) {
    await this.loginSessions.deleteForUser(userId, exceptSessionId);
  }

  async createApiKeyRevealOtp(institutionId: string, userId: string) {
    const institution = await this.institutions.findById(institutionId);
    if (!institution) throw new Error('Institution not found');

    await this.tryBackfillApiKeyCiphertext(institution);

    const code = generateOtpCode(this.nodeEnv);
    const requestId = generateId('otp');
    await this.otp.save({
      id: requestId,
      institutionId,
      userId,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      purpose: 'api_key_reveal',
    });

    const user = await this.users.findById(userId);
    const deliveryEmail = user?.email ?? institution.email;

    if (deliveryEmail) {
      await this.email.send(
        deliveryEmail,
        'Rain: API key verification code',
        `Your verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request to view your API key, contact Rain support immediately.`,
      );
    }

    return {
      requestId,
      deliveryHint: maskEmail(deliveryEmail),
    };
  }

  /** Dev-only: restore encrypted storage for seeded keys created before ciphertext existed. */
  private async tryBackfillApiKeyCiphertext(
    institution: InstitutionEntity,
  ): Promise<void> {
    if (institution.apiKeyCiphertext || this.nodeEnv === 'production') {
      return;
    }
    const known = this.knownDevApiKeysByPrefix().get(institution.apiKeyPrefix);
    if (!known) return;
    await applyApiKeyPlaintext(institution, known, this.encryptionSecret);
    await this.institutions.save(institution);
  }

  private knownDevApiKeysByPrefix(): Map<string, string> {
    const demo = `${API_KEY_PREFIX}demo_development_key`;
    return new Map([[demo.slice(0, 16), demo]]);
  }

  async revealApiKeyWithOtp(input: {
    institutionId: string;
    userId: string;
    requestId: string;
    otp: string;
  }) {
    const otp = await this.otp.findById(input.requestId);
    if (
      !otp ||
      otp.institutionId !== input.institutionId ||
      otp.userId !== input.userId ||
      otp.purpose !== 'api_key_reveal'
    ) {
      throw new BadRequestException('Invalid or expired verification request.');
    }
    if (new Date(otp.expiresAt) < new Date()) {
      await this.otp.delete(input.requestId);
      throw new BadRequestException('Verification code expired.');
    }
    if (otp.code !== input.otp.trim()) {
      throw new BadRequestException('Incorrect verification code.');
    }
    await this.otp.delete(input.requestId);

    const institution = await this.institutions.findById(input.institutionId);
    if (!institution) throw new Error('Institution not found');

    const fullKey = readApiKeyPlaintext(institution, this.encryptionSecret);
    if (!fullKey) {
      throw new BadRequestException(
        'This API key cannot be revealed. Use Rotate key to generate a new key you can reveal after verification.',
      );
    }

    return { fullKey };
  }

  async rotateApiKey(institutionId: string) {
    const institution = await this.institutions.findById(institutionId);
    if (!institution) throw new Error('Institution not found');
    const suffix = randomBytes(16).toString('hex');
    const fullKey = `${API_KEY_PREFIX}${suffix}`;
    await applyApiKeyPlaintext(
      institution,
      fullKey,
      this.encryptionSecret,
    );
    await this.institutions.save(institution);
    return {
      fullKey,
      apiKey: {
        keyPrefix: institution.apiKeyPrefix,
        maskedKey: `${institution.apiKeyPrefix}…`,
        createdAt: institution.apiKeyCreatedAt,
        lastUsedAt: institution.apiKeyLastUsedAt,
      },
    };
  }

  async upsertWebhook(
    institutionId: string,
    input: { id?: string; url: string; events: WebhookEventType[] },
  ) {
    if (input.id) {
      const existing = await this.webhooks.findById(input.id);
      if (existing && existing.institutionId === institutionId) {
        existing.url = input.url;
        existing.events = input.events;
        await this.webhooks.save(existing);
        return { webhook: this.toWebhookDto(existing) };
      }
    }
    const secret = randomBytes(24).toString('hex');
    const endpoint: WebhookEndpointEntity = {
      id: generateId('wh'),
      institutionId,
      url: input.url,
      events: input.events,
      secret,
      secretPreview: `${secret.slice(0, 6)}…`,
      enabled: true,
    };
    await this.webhooks.save(endpoint);
    return {
      webhook: this.toWebhookDto(endpoint),
      signingSecret: secret,
    };
  }

  async patchWebhook(
    institutionId: string,
    id: string,
    patch: Partial<{ url: string; events: WebhookEventType[]; enabled: boolean }>,
  ) {
    const endpoint = await this.webhooks.findById(id);
    if (!endpoint || endpoint.institutionId !== institutionId) {
      throw new Error('Webhook not found');
    }
    Object.assign(endpoint, patch);
    await this.webhooks.save(endpoint);
    return this.toWebhookDto(endpoint);
  }

  async removeWebhook(institutionId: string, id: string) {
    const endpoint = await this.webhooks.findById(id);
    if (endpoint?.institutionId === institutionId) {
      await this.webhooks.delete(id);
    }
  }

  private toWebhookDto(w: WebhookEndpointEntity) {
    return {
      id: w.id,
      url: w.url,
      events: w.events,
      secretPreview: w.secretPreview,
      enabled: w.enabled,
      lastDeliveryAt: w.lastDeliveryAt,
      lastDeliveryStatus: w.lastDeliveryStatus,
    };
  }
}
