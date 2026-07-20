import { Injectable } from '@nestjs/common';
import type { OtpRequestEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toOtp } from '../mappers/prisma-mappers';

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entity: OtpRequestEntity): Promise<void> {
    await this.prisma.otpRequest.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        institutionId: entity.institutionId,
        userId: entity.userId,
        code: entity.code,
        expiresAt: new Date(entity.expiresAt),
        purpose: entity.purpose,
      },
      update: {
        code: entity.code,
        expiresAt: new Date(entity.expiresAt),
      },
    });
  }

  async findById(id: string): Promise<OtpRequestEntity | null> {
    const row = await this.prisma.otpRequest.findUnique({ where: { id } });
    return row ? toOtp(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.otpRequest.delete({ where: { id } }).catch(() => {});
  }
}
