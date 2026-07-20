import { Injectable } from '@nestjs/common';
import { generateId, generateReference } from '../../common/utils/ids';
import { buildSignalKey } from '../../common/utils/signal-key';
import {
  maskAccountNumber,
  maskEmail,
  maskIdentifier,
  maskPhone,
} from '../../common/utils/masking';
import { buildApiConfidence } from '../../common/utils/confidence';
import type {
  InstitutionEntity,
  IdentifierType,
  ReportCategory,
  ReportEntity,
} from '../../domain/types';
import { ReportRepository } from '../../persistence';
import { IdempotencyService } from '../verifications/idempotency.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';

export interface CreateReportInput {
  identifierType: IdentifierType;
  identifier: string;
  email: string;
  category: ReportCategory;
  description: string;
  incidentDate: string;
  fullName?: string;
  bank?: string;
  accountNumber?: string;
  phone?: string;
  amountInvolved?: number;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly idempotency: IdempotencyService,
    private readonly webhooks: WebhooksService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    institution: InstitutionEntity,
    input: CreateReportInput,
    idempotencyKey?: string,
  ): Promise<ReportEntity> {
    if (idempotencyKey) {
      const existingId = await this.idempotency.get(
        institution.id,
        idempotencyKey,
        'report',
      );
      if (existingId) {
        const existing = await this.reports.findById(existingId);
        if (existing) return existing;
      }
    }

    const signalKey = buildSignalKey(input.identifierType, input.identifier);
    const signal = await this.reports.getNetworkSignal(signalKey);
    const sourceCount = signal?.sourceCount ?? 1;

    const entity: ReportEntity = {
      id: generateId('rpt'),
      institutionId: institution.id,
      reference: generateReference('RPT'),
      identifierType: input.identifierType,
      maskedIdentifier: maskIdentifier(input.identifierType, input.identifier),
      maskedEmail: maskEmail(input.email),
      maskedPhone: input.phone ? maskPhone(input.phone) : undefined,
      maskedAccountNumber: input.accountNumber
        ? maskAccountNumber(input.accountNumber)
        : undefined,
      fullName: input.fullName,
      bank: input.bank,
      category: input.category,
      description: input.description,
      incidentDate: input.incidentDate,
      amountInvolved: input.amountInvolved,
      independentSourceCount: sourceCount,
      confidence: buildApiConfidence(sourceCount),
      earningsGenerated: 0,
      submittedAt: new Date().toISOString(),
      signalKey,
    };

    await this.reports.save(entity);
    if (idempotencyKey) {
      await this.idempotency.set(
        institution.id,
        idempotencyKey,
        'report',
        entity.id,
      );
    }

    await this.notifications.add(
      institution.id,
      'Report submitted',
      `Report ${entity.reference} was filed on the Rain network.`,
    );

    void this.webhooks.emitReportSubmitted(institution.id, entity);
    return entity;
  }

  async list(
    institutionId: string,
    filters: {
      page?: number;
      pageSize?: number;
      category?: string;
      confidence?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    let data = await this.reports.listForInstitution(institutionId);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(
        (r) =>
          r.reference.toLowerCase().includes(q) ||
          r.maskedIdentifier.toLowerCase().includes(q),
      );
    }
    if (filters.category && filters.category !== 'all') {
      data = data.filter((r) => r.category === filters.category);
    }
    if (filters.confidence && filters.confidence !== 'all') {
      data = data.filter((r) => r.confidence.level === filters.confidence);
    }
    if (filters.dateFrom) {
      data = data.filter((r) => r.submittedAt >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      data = data.filter(
        (r) => r.submittedAt <= `${filters.dateTo}T23:59:59Z`,
      );
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
    return this.reports.findByIdOrRef(institutionId, idOrRef);
  }
}
