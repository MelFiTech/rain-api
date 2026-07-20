import { Injectable } from '@nestjs/common';
import { buildApiConfidence } from '../../common/utils/confidence';
import { generateId, generateReference } from '../../common/utils/ids';
import { maskIdentifier } from '../../common/utils/masking';
import { buildSignalKey } from '../../common/utils/signal-key';
import type {
  IdentifierType,
  InstitutionEntity,
  ReportCategory,
  VerificationEntity,
  VerificationResult,
} from '../../domain/types';
import { AppConfigService } from '../app-config/app-config.service';
import { ReportRepository, VerificationRepository } from '../../persistence';
import { EarningsService } from '../earnings/earnings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlatformCustomersService } from '../platform-customers/platform-customers.service';
import { WalletService } from '../wallet/wallet.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { IdempotencyService } from './idempotency.service';

export interface CreateVerificationInput {
  identifierType: IdentifierType;
  identifier: string;
  email: string;
  phone?: string;
  accountNumber?: string;
  bankCode?: string;
  fullName?: string;
}

@Injectable()
export class VerificationsService {
  constructor(
    private readonly verifications: VerificationRepository,
    private readonly reports: ReportRepository,
    private readonly wallet: WalletService,
    private readonly webhooks: WebhooksService,
    private readonly idempotency: IdempotencyService,
    private readonly earnings: EarningsService,
    private readonly notifications: NotificationsService,
    private readonly platformCustomers: PlatformCustomersService,
    private readonly appConfig: AppConfigService,
  ) {}

  async create(
    institution: InstitutionEntity,
    input: CreateVerificationInput,
    idempotencyKey?: string,
  ): Promise<VerificationEntity> {
    if (idempotencyKey) {
      const existingId = await this.idempotency.get(
        institution.id,
        idempotencyKey,
        'verification',
      );
      if (existingId) {
        const existing = await this.verifications.findById(existingId);
        if (existing) return existing;
      }
    }

    const verificationCost = await this.appConfig.getVerificationCost();

    if (institution.walletBalance < verificationCost) {
      const error = new Error('INSUFFICIENT_BALANCE');
      (error as Error & { balance: number; cost: number }).balance =
        institution.walletBalance;
      (error as Error & { balance: number; cost: number }).cost =
        verificationCost;
      throw error;
    }

    const signalKey = buildSignalKey(input.identifierType, input.identifier);
    const signal = await this.reports.getNetworkSignal(signalKey);
    const reportsForSignal = await this.reports.listBySignalKey(signalKey);

    let result: VerificationResult = 'no_match';
    let sourceCount = 0;
    let categories: ReportCategory[] | undefined;

    if (signal && signal.sourceCount > 0) {
      result = 'match';
      sourceCount = signal.sourceCount;
      categories = signal.categories as ReportCategory[];
    }

    await this.wallet.chargeVerification(institution.id, verificationCost);

    const masked = maskIdentifier(input.identifierType, input.identifier);
    const entity: VerificationEntity = {
      id: generateId('ver'),
      institutionId: institution.id,
      reference: generateReference('VER'),
      identifierType: input.identifierType,
      maskedIdentifier: masked,
      result,
      confidence:
        result === 'match' ? buildApiConfidence(sourceCount) : null,
      independentSourceCount: sourceCount,
      totalReports: result === 'match' ? reportsForSignal.length : undefined,
      categories,
      firstReportedAt: signal?.firstReportedAt,
      mostRecentReportAt:
        result === 'match' && reportsForSignal[0]
          ? reportsForSignal[0].submittedAt
          : undefined,
      amountCharged: verificationCost,
      createdAt: new Date().toISOString(),
    };

    await this.verifications.save(entity);
    if (idempotencyKey) {
      await this.idempotency.set(
        institution.id,
        idempotencyKey,
        'verification',
        entity.id,
      );
    }

    await this.platformCustomers.registerFromVerification({
      institutionId: institution.id,
      identifierType: input.identifierType,
      maskedIdentifier: masked,
      signalKey,
      displayName: input.fullName ?? input.email,
    });

    if (result === 'match') {
      await this.earnings.distributeMatchRewards(signalKey, institution.id);
    }

    await this.notifications.add(
      institution.id,
      result === 'match' ? 'Verification match' : 'Verification complete',
      result === 'match'
        ? `Verification ${entity.reference} found network signals for ${masked}.`
        : `Verification ${entity.reference} returned no network match.`,
    );

    void this.webhooks.emitVerificationCompleted(institution.id, entity);
    return entity;
  }

  async list(
    institutionId: string,
    filters: {
      page?: number;
      pageSize?: number;
      result?: string;
      confidence?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    let data = await this.verifications.listForInstitution(institutionId);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(
        (v) =>
          v.reference.toLowerCase().includes(q) ||
          v.maskedIdentifier.toLowerCase().includes(q),
      );
    }
    if (filters.result && filters.result !== 'all') {
      data = data.filter((v) => v.result === filters.result);
    }
    if (filters.confidence && filters.confidence !== 'all') {
      data = data.filter((v) => v.confidence?.level === filters.confidence);
    }
    if (filters.dateFrom) {
      data = data.filter((v) => v.createdAt >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      data = data.filter((v) => v.createdAt <= `${filters.dateTo}T23:59:59Z`);
    }

    const total = data.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return {
      data: data.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getOne(institutionId: string, idOrRef: string) {
    return this.verifications.findByIdOrRef(institutionId, idOrRef);
  }
}
