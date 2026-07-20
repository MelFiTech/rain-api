import { Injectable } from '@nestjs/common';
import type { PlatformCustomerEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toPlatformCustomer } from '../mappers/prisma-mappers';

@Injectable()
export class PlatformCustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForInstitution(
    institutionId: string,
  ): Promise<PlatformCustomerEntity[]> {
    const rows = await this.prisma.platformCustomer.findMany({
      where: { institutionId },
    });
    return rows.map(toPlatformCustomer);
  }

  async findBySignalKey(
    institutionId: string,
    signalKey: string,
  ): Promise<PlatformCustomerEntity | null> {
    const row = await this.prisma.platformCustomer.findFirst({
      where: { institutionId, signalKey },
    });
    return row ? toPlatformCustomer(row) : null;
  }

  async save(entity: PlatformCustomerEntity): Promise<void> {
    await this.prisma.platformCustomer.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        institutionId: entity.institutionId,
        customerId: entity.customerId,
        displayName: entity.displayName,
        matchedField: entity.matchedField,
        maskedIdentifier: entity.maskedIdentifier,
        signalKey: entity.signalKey,
        onboardedAt: new Date(entity.onboardedAt),
        status: entity.status,
      },
      update: {
        displayName: entity.displayName,
        status: entity.status,
      },
    });
  }
}
