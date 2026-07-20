import { Injectable } from '@nestjs/common';
import type { LoginSessionEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  loginSessionToPrisma,
  toLoginSession,
} from '../mappers/prisma-mappers';

@Injectable()
export class LoginSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<LoginSessionEntity[]> {
    const rows = await this.prisma.loginSession.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
    });
    return rows.map(toLoginSession);
  }

  async findById(id: string): Promise<LoginSessionEntity | null> {
    const row = await this.prisma.loginSession.findUnique({ where: { id } });
    return row ? toLoginSession(row) : null;
  }

  async save(entity: LoginSessionEntity): Promise<void> {
    await this.prisma.loginSession.upsert({
      where: { id: entity.id },
      create: loginSessionToPrisma(entity),
      update: loginSessionToPrisma(entity),
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.loginSession.delete({ where: { id } }).catch(() => {});
  }

  async markOthersNotCurrent(
    userId: string,
    exceptSessionId: string,
  ): Promise<void> {
    await this.prisma.loginSession.updateMany({
      where: { userId, id: { not: exceptSessionId } },
      data: { current: false },
    });
  }

  async deleteForUser(
    userId: string,
    exceptSessionId?: string,
  ): Promise<void> {
    await this.prisma.loginSession.deleteMany({
      where: {
        userId,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
    });
  }
}
