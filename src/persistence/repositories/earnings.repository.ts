import { Injectable } from '@nestjs/common';
import type {
  EarningRecordEntity,
  EarningsWithdrawalRequestEntity,
  InstitutionEntity,
} from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  earningToPrisma,
  earningsWithdrawalToPrisma,
  toEarning,
  toEarningsWithdrawalRequest,
} from '../mappers/prisma-mappers';

@Injectable()
export class EarningsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForInstitution(
    institutionId: string,
  ): Promise<EarningRecordEntity[]> {
    const rows = await this.prisma.earningRecord.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEarning);
  }

  async save(entity: EarningRecordEntity): Promise<void> {
    await this.prisma.earningRecord.upsert({
      where: { id: entity.id },
      create: earningToPrisma(entity),
      update: earningToPrisma(entity),
    });
  }

  async hasForReport(
    institutionId: string,
    reportReference: string,
  ): Promise<boolean> {
    const count = await this.prisma.earningRecord.count({
      where: { institutionId, reportReference },
    });
    return count > 0;
  }

  async saveWithdrawalRequest(
    entity: EarningsWithdrawalRequestEntity,
  ): Promise<void> {
    await this.prisma.earningsWithdrawalRequest.upsert({
      where: { id: entity.id },
      create: earningsWithdrawalToPrisma(entity),
      update: earningsWithdrawalToPrisma(entity),
    });
  }

  async findWithdrawalByReference(
    institutionId: string,
    reference: string,
  ): Promise<EarningsWithdrawalRequestEntity | null> {
    const row = await this.prisma.earningsWithdrawalRequest.findFirst({
      where: { institutionId, reference },
    });
    return row ? toEarningsWithdrawalRequest(row) : null;
  }

  async findWithdrawalByReferenceGlobal(
    reference: string,
  ): Promise<EarningsWithdrawalRequestEntity | null> {
    const row = await this.prisma.earningsWithdrawalRequest.findFirst({
      where: { reference },
    });
    return row ? toEarningsWithdrawalRequest(row) : null;
  }

  async claimMonnifyWebhookEvent(input: {
    id: string;
    dedupeKey: string;
    eventType: string;
  }): Promise<boolean> {
    try {
      await this.prisma.monnifyWebhookReceipt.create({
        data: {
          id: input.id,
          dedupeKey: input.dedupeKey,
          eventType: input.eventType,
        },
      });
      return true;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }

  async listWithdrawalsReadyForProcessing(
    limit = 20,
  ): Promise<EarningsWithdrawalRequestEntity[]> {
    const rows = await this.prisma.earningsWithdrawalRequest.findMany({
      where: {
        status: 'queued',
        processAfterAt: { lte: new Date() },
      },
      orderBy: { processAfterAt: 'asc' },
      take: limit,
    });
    return rows.map(toEarningsWithdrawalRequest);
  }

  async listWithdrawals(
    status?: string,
  ): Promise<
    (EarningsWithdrawalRequestEntity & {
      institutionName: string;
      institutionEmail: string;
      settlementBank: InstitutionEntity['settlementBank'];
    })[]
  > {
    const rows = await this.prisma.earningsWithdrawalRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        institution: {
          select: { name: true, email: true, settlementBank: true },
        },
      },
    });
    return rows.map((row) => ({
      ...toEarningsWithdrawalRequest(row),
      institutionName: row.institution.name,
      institutionEmail: row.institution.email,
      settlementBank: row.institution
        .settlementBank as unknown as InstitutionEntity['settlementBank'],
    }));
  }

  async findWithdrawalById(
    id: string,
  ): Promise<EarningsWithdrawalRequestEntity | null> {
    const row = await this.prisma.earningsWithdrawalRequest.findUnique({
      where: { id },
    });
    return row ? toEarningsWithdrawalRequest(row) : null;
  }

  async claimWithdrawalForProcessing(
    id: string,
  ): Promise<EarningsWithdrawalRequestEntity | null> {
    const result = await this.prisma.earningsWithdrawalRequest.updateMany({
      where: {
        id,
        status: 'queued',
        processAfterAt: { lte: new Date() },
      },
      data: { status: 'processing' },
    });
    if (result.count === 0) return null;
    const row = await this.prisma.earningsWithdrawalRequest.findUnique({
      where: { id },
    });
    return row ? toEarningsWithdrawalRequest(row) : null;
  }
}
