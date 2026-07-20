import { Injectable } from '@nestjs/common';
import type { ReportCategory } from '../../domain/types';
import {
  InstitutionRepository,
  ReportRepository,
} from '../../persistence';

@Injectable()
export class NetworkService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly institutions: InstitutionRepository,
  ) {}

  /** Live feed of reports filed by other member institutions. */
  async getReportStream(forInstitutionId: string, limit = 20) {
    const allReports = await this.reports.listAll();
    const filtered = allReports
      .filter((r) => r.institutionId !== forInstitutionId)
      .slice(0, limit);

    return Promise.all(
      filtered.map(async (r) => {
        const inst = await this.institutions.findById(r.institutionId);
        return {
          id: r.id,
          institutionName: inst?.name ?? 'Member institution',
          category: r.category as ReportCategory,
          maskedIdentifier: r.maskedIdentifier,
          reference: r.reference,
          submittedAt: r.submittedAt,
          signalKey: r.signalKey,
        };
      }),
    );
  }
}
