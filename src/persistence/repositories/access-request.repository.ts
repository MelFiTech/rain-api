import { Injectable } from '@nestjs/common';
import type { AccessRequestEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toAccessRequest } from '../mappers/prisma-mappers';

@Injectable()
export class AccessRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entity: AccessRequestEntity): Promise<void> {
    await this.prisma.accessRequest.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        companyName: entity.companyName,
        email: entity.email,
        cacNumber: entity.cacNumber,
        passwordHash: entity.passwordHash,
        status: entity.status,
        createdAt: new Date(entity.createdAt),
        reviewedAt: entity.reviewedAt ? new Date(entity.reviewedAt) : null,
        reviewedByEmail: entity.reviewedByEmail ?? null,
        rejectionReason: entity.rejectionReason ?? null,
        institutionId: entity.institutionId ?? null,
        onboardingTokenHash: entity.onboardingTokenHash ?? null,
        onboardingExpiresAt: entity.onboardingExpiresAt
          ? new Date(entity.onboardingExpiresAt)
          : null,
      },
      update: {
        companyName: entity.companyName,
        email: entity.email,
        cacNumber: entity.cacNumber,
        passwordHash: entity.passwordHash,
        status: entity.status,
        reviewedAt: entity.reviewedAt ? new Date(entity.reviewedAt) : null,
        reviewedByEmail: entity.reviewedByEmail ?? null,
        rejectionReason: entity.rejectionReason ?? null,
        institutionId: entity.institutionId ?? null,
        onboardingTokenHash: entity.onboardingTokenHash ?? null,
        onboardingExpiresAt: entity.onboardingExpiresAt
          ? new Date(entity.onboardingExpiresAt)
          : null,
      },
    });
  }

  async findById(id: string): Promise<AccessRequestEntity | null> {
    const row = await this.prisma.accessRequest.findUnique({ where: { id } });
    return row ? toAccessRequest(row) : null;
  }

  async findPendingByEmail(
    email: string,
  ): Promise<AccessRequestEntity | null> {
    const row = await this.prisma.accessRequest.findFirst({
      where: { email: email.trim().toLowerCase(), status: 'pending' },
    });
    return row ? toAccessRequest(row) : null;
  }

  async findByOnboardingTokenHash(
    tokenHash: string,
  ): Promise<AccessRequestEntity | null> {
    const row = await this.prisma.accessRequest.findUnique({
      where: { onboardingTokenHash: tokenHash },
    });
    return row ? toAccessRequest(row) : null;
  }

  async list(status?: string): Promise<AccessRequestEntity[]> {
    const rows = await this.prisma.accessRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAccessRequest);
  }
}
