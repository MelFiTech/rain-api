import { Injectable } from '@nestjs/common';
import type { NotificationEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toNotification } from '../mappers/prisma-mappers';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForInstitution(
    institutionId: string,
  ): Promise<NotificationEntity[]> {
    const rows = await this.prisma.notification.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toNotification);
  }

  async save(entity: NotificationEntity): Promise<void> {
    await this.prisma.notification.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        institutionId: entity.institutionId,
        title: entity.title,
        message: entity.message,
        read: entity.read,
        createdAt: new Date(entity.createdAt),
      },
      update: {
        title: entity.title,
        message: entity.message,
        read: entity.read,
      },
    });
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return row ? toNotification(row) : null;
  }
}
