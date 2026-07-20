import { Injectable } from '@nestjs/common';
import type { TeamInviteEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toTeamInvite } from '../mappers/prisma-mappers';

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listInvites(institutionId: string): Promise<TeamInviteEntity[]> {
    const rows = await this.prisma.teamInvite.findMany({
      where: { institutionId },
    });
    return rows.map(toTeamInvite);
  }

  async saveInvite(entity: TeamInviteEntity): Promise<void> {
    await this.prisma.teamInvite.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        institutionId: entity.institutionId,
        name: entity.name,
        email: entity.email,
        role: entity.role,
        status: entity.status,
        invitedAt: new Date(entity.invitedAt),
        tokenHash: entity.tokenHash ?? null,
        expiresAt: entity.expiresAt ? new Date(entity.expiresAt) : null,
      },
      update: {
        name: entity.name,
        email: entity.email,
        role: entity.role,
        status: entity.status,
        tokenHash: entity.tokenHash ?? null,
        expiresAt: entity.expiresAt ? new Date(entity.expiresAt) : null,
      },
    });
  }

  async findInviteByTokenHash(
    tokenHash: string,
  ): Promise<TeamInviteEntity | null> {
    const row = await this.prisma.teamInvite.findUnique({
      where: { tokenHash },
    });
    return row ? toTeamInvite(row) : null;
  }

  async findInviteByEmail(
    institutionId: string,
    email: string,
  ): Promise<TeamInviteEntity | null> {
    const row = await this.prisma.teamInvite.findFirst({
      where: {
        institutionId,
        email: email.trim().toLowerCase(),
        status: 'invited',
      },
    });
    return row ? toTeamInvite(row) : null;
  }

  async findInvite(id: string): Promise<TeamInviteEntity | null> {
    const row = await this.prisma.teamInvite.findUnique({ where: { id } });
    return row ? toTeamInvite(row) : null;
  }
}
