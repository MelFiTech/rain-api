import { Injectable } from '@nestjs/common';
import type { UserEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toUser, userToPrisma } from '../mappers/prisma-mappers';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalized = email.trim().toLowerCase();
    const row = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    return row ? toUser(row) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async save(entity: UserEntity): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: entity.id },
      create: userToPrisma(entity),
      update: userToPrisma(entity),
    });
  }

  async listByInstitution(institutionId: string): Promise<UserEntity[]> {
    const rows = await this.prisma.user.findMany({
      where: { institutionId },
    });
    return rows.map(toUser);
  }
}
