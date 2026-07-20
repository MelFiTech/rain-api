import { Injectable } from '@nestjs/common';
import { IDEMPOTENCY_TTL_MS } from '../../common/constants';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IdempotencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getResourceId(
    institutionId: string,
    key: string,
    resourceType: 'verification' | 'report',
  ): Promise<string | null> {
    const row = await this.prisma.idempotencyKey.findUnique({
      where: {
        institutionId_resourceType_key: {
          institutionId,
          resourceType,
          key,
        },
      },
    });
    if (!row) return null;
    if (Date.now() - row.createdAt.getTime() > IDEMPOTENCY_TTL_MS) {
      await this.prisma.idempotencyKey.delete({ where: { id: row.id } });
      return null;
    }
    return row.resourceId;
  }

  async set(
    institutionId: string,
    key: string,
    resourceType: 'verification' | 'report',
    resourceId: string,
  ): Promise<void> {
    await this.prisma.idempotencyKey.upsert({
      where: {
        institutionId_resourceType_key: {
          institutionId,
          resourceType,
          key,
        },
      },
      create: { institutionId, key, resourceType, resourceId },
      update: { resourceId },
    });
  }
}
