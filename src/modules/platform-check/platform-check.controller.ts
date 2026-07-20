import { Body, Controller, Post } from '@nestjs/common';
import { CurrentInstitution } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity } from '../../domain/types';
import { ReportRepository } from '../../persistence';
import { PlatformCustomersService } from '../platform-customers/platform-customers.service';

@Controller('platform')
export class PlatformCheckController {
  constructor(
    private readonly reports: ReportRepository,
    private readonly customers: PlatformCustomersService,
  ) {}

  @Post('check-report')
  async check(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body()
    body: { reportId: string; reference: string; maskedIdentifier: string },
  ) {
    const report =
      (await this.reports.findById(body.reportId)) ??
      (await this.reports.findByReference(body.reference));

    const checkedAt = new Date().toISOString();

    if (!report) {
      return {
        matched: false,
        reportReference: body.reference,
        checkedAt,
      };
    }

    const customer = await this.customers.findMatchForNetworkReport(
      institution.id,
      report.signalKey,
    );

    if (!customer) {
      return {
        matched: false,
        reportReference: body.reference,
        checkedAt,
      };
    }

    return {
      matched: true,
      customer: {
        customerId: customer.customerId,
        displayName: customer.displayName,
        matchedField: customer.matchedField,
        maskedIdentifier: customer.maskedIdentifier,
        onboardedAt: customer.onboardedAt,
        status: customer.status,
      },
      reportReference: body.reference,
      checkedAt,
    };
  }
}
