import { Controller, Get } from '@nestjs/common';
import { CurrentInstitution } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity } from '../../domain/types';
import {
  ReportRepository,
  VerificationRepository,
} from '../../persistence';
import { EarningsService } from '../earnings/earnings.service';
import { NetworkService } from '../network/network.service';
import { toPlatformReport } from '../reports/reports.mapper';
import { toPlatformVerification } from '../verifications/verifications.mapper';

@Controller('platform/dashboard')
export class DashboardController {
  constructor(
    private readonly verifications: VerificationRepository,
    private readonly reports: ReportRepository,
    private readonly earnings: EarningsService,
    private readonly network: NetworkService,
  ) {}

  @Get()
  async summary(@CurrentInstitution() institution: InstitutionEntity) {
    const verificationRows = await this.verifications.listForInstitution(
      institution.id,
    );
    const reportRows = await this.reports.listForInstitution(institution.id);
    const earnings = await this.earnings.getSummary(institution.id);

    return {
      walletBalance: institution.walletBalance,
      totalVerifications: verificationRows.length,
      usersReported: reportRows.length,
      totalEarnings: earnings.lifetime,
      recentVerifications: verificationRows
        .slice(0, 5)
        .map(toPlatformVerification),
      recentReports: reportRows.slice(0, 5).map(toPlatformReport),
      recentEarnings: earnings.records.slice(0, 5),
      reportStream: await this.network.getReportStream(institution.id, 15),
    };
  }
}
