import { Injectable } from '@nestjs/common';
import type { WebhookEndpointEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toWebhook, webhookToPrisma } from '../mappers/prisma-mappers';

@Injectable()
export class WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForInstitution(
    institutionId: string,
  ): Promise<WebhookEndpointEntity[]> {
    const rows = await this.prisma.webhookEndpoint.findMany({
      where: { institutionId },
    });
    return rows.map(toWebhook);
  }

  async findById(id: string): Promise<WebhookEndpointEntity | null> {
    const row = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    return row ? toWebhook(row) : null;
  }

  async save(entity: WebhookEndpointEntity): Promise<void> {
    await this.prisma.webhookEndpoint.upsert({
      where: { id: entity.id },
      create: webhookToPrisma(entity),
      update: webhookToPrisma(entity),
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhookEndpoint.delete({ where: { id } }).catch(() => {});
  }
}
