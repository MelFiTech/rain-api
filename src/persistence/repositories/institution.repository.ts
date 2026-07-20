import { Injectable } from '@nestjs/common';
import { generateId } from '../../common/utils/ids';
import type {
  InstitutionEntity,
  WalletTransactionEntity,
} from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  institutionToPrisma,
  toInstitution,
} from '../mappers/prisma-mappers';

@Injectable()
export class InstitutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<InstitutionEntity | null> {
    const row = await this.prisma.institution.findUnique({ where: { id } });
    return row ? toInstitution(row) : null;
  }

  async save(entity: InstitutionEntity): Promise<void> {
    await this.prisma.institution.upsert({
      where: { id: entity.id },
      create: institutionToPrisma(entity),
      update: institutionToPrisma(entity),
    });
  }

  async findByApiKeyPrefix(prefix: string): Promise<InstitutionEntity[]> {
    const rows = await this.prisma.institution.findMany({
      where: { apiKeyPrefix: prefix },
    });
    return rows.map(toInstitution);
  }

  async listAll(): Promise<InstitutionEntity[]> {
    const rows = await this.prisma.institution.findMany();
    return rows.map(toInstitution);
  }

  async touchApiKeyLastUsed(institutionId: string): Promise<void> {
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: { apiKeyLastUsedAt: new Date() },
    });
  }

  async adjustWalletBalance(
    institutionId: string,
    delta: number,
    txn: Omit<WalletTransactionEntity, 'id' | 'institutionId'>,
  ): Promise<InstitutionEntity> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.institution.update({
        where: { id: institutionId },
        data: { walletBalance: { increment: delta } },
      });
      await tx.walletTransaction.create({
        data: {
          id: generateId('txn'),
          institutionId,
          type: txn.type,
          amount: txn.amount,
          balanceAfter: updated.walletBalance,
          description: txn.description,
          reference: txn.reference,
          createdAt: new Date(txn.createdAt),
        },
      });
      return toInstitution(updated);
    });
  }
}
