import { Injectable } from '@nestjs/common';
import type { VerificationEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toVerification,
  verificationToPrisma,
} from '../mappers/prisma-mappers';

@Injectable()
export class VerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entity: VerificationEntity): Promise<void> {
    await this.prisma.verification.upsert({
      where: { id: entity.id },
      create: verificationToPrisma(entity),
      update: verificationToPrisma(entity),
    });
  }

  async findById(id: string): Promise<VerificationEntity | null> {
    const row = await this.prisma.verification.findUnique({ where: { id } });
    return row ? toVerification(row) : null;
  }

  async findByIdOrRef(
    institutionId: string,
    idOrRef: string,
  ): Promise<VerificationEntity | null> {
    const row = await this.prisma.verification.findFirst({
      where: {
        institutionId,
        OR: [{ id: idOrRef }, { reference: idOrRef }],
      },
    });
    return row ? toVerification(row) : null;
  }

  async listForInstitution(
    institutionId: string,
  ): Promise<VerificationEntity[]> {
    const rows = await this.prisma.verification.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toVerification);
  }
}
