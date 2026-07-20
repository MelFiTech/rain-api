import { Injectable } from '@nestjs/common';
import type { ReportEntity } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import { reportToPrisma, toReport } from '../mappers/prisma-mappers';

export interface NetworkSignal {
  sourceCount: number;
  categories: string[];
  firstReportedAt: string;
}

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entity: ReportEntity): Promise<void> {
    await this.prisma.report.upsert({
      where: { id: entity.id },
      create: reportToPrisma(entity),
      update: reportToPrisma(entity),
    });
  }

  async findById(id: string): Promise<ReportEntity | null> {
    const row = await this.prisma.report.findUnique({ where: { id } });
    return row ? toReport(row) : null;
  }

  async findByIdOrRef(
    institutionId: string,
    idOrRef: string,
  ): Promise<ReportEntity | null> {
    const row = await this.prisma.report.findFirst({
      where: {
        institutionId,
        OR: [{ id: idOrRef }, { reference: idOrRef }],
      },
    });
    return row ? toReport(row) : null;
  }

  async findByReference(reference: string): Promise<ReportEntity | null> {
    const row = await this.prisma.report.findFirst({
      where: { reference },
    });
    return row ? toReport(row) : null;
  }

  async listForInstitution(institutionId: string): Promise<ReportEntity[]> {
    const rows = await this.prisma.report.findMany({
      where: { institutionId },
      orderBy: { submittedAt: 'desc' },
    });
    return rows.map(toReport);
  }

  async listBySignalKey(signalKey: string): Promise<ReportEntity[]> {
    const rows = await this.prisma.report.findMany({
      where: { signalKey },
      orderBy: { submittedAt: 'desc' },
    });
    return rows.map(toReport);
  }

  async listAll(): Promise<ReportEntity[]> {
    const rows = await this.prisma.report.findMany({
      orderBy: { submittedAt: 'desc' },
    });
    return rows.map(toReport);
  }

  async getNetworkSignal(signalKey: string): Promise<NetworkSignal | null> {
    const reports = await this.prisma.report.findMany({
      where: { signalKey },
      select: { institutionId: true, category: true, submittedAt: true },
      orderBy: { submittedAt: 'asc' },
    });
    if (reports.length === 0) return null;
    const institutions = new Set(reports.map((r) => r.institutionId));
    const categories = [...new Set(reports.map((r) => r.category))];
    return {
      sourceCount: institutions.size,
      categories,
      firstReportedAt: reports[0]!.submittedAt.toISOString(),
    };
  }
}
