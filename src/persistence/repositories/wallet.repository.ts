import { Injectable } from '@nestjs/common';
import type {
  FundSessionEntity,
  WalletTransactionEntity,
} from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  fundSessionToPrisma,
  toFundSession,
  toWalletTxn,
} from '../mappers/prisma-mappers';

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTransactions(
    institutionId: string,
  ): Promise<WalletTransactionEntity[]> {
    const rows = await this.prisma.walletTransaction.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toWalletTxn);
  }

  async hasFundingForSessionReference(
    institutionId: string,
    sessionReference: string,
  ): Promise<boolean> {
    const count = await this.prisma.walletTransaction.count({
      where: {
        institutionId,
        type: 'funding',
        description: { contains: sessionReference },
      },
    });
    return count > 0;
  }

  async saveFundSession(entity: FundSessionEntity): Promise<void> {
    await this.prisma.fundSession.upsert({
      where: { id: entity.id },
      create: fundSessionToPrisma(entity),
      update: fundSessionToPrisma(entity),
    });
  }

  async findFundSessionByPaymentReference(
    reference: string,
  ): Promise<FundSessionEntity | null> {
    const row = await this.prisma.fundSession.findFirst({
      where: {
        OR: [{ reference }, { transactionReference: reference }],
      },
    });
    return row ? toFundSession(row) : null;
  }

  async findFundSessionById(id: string): Promise<FundSessionEntity | null> {
    const row = await this.prisma.fundSession.findUnique({ where: { id } });
    return row ? toFundSession(row) : null;
  }

  async findFundSessionByTransactionReference(
    transactionReference: string,
  ): Promise<FundSessionEntity | null> {
    const row = await this.prisma.fundSession.findFirst({
      where: { transactionReference },
    });
    return row ? toFundSession(row) : null;
  }
}
