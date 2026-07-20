import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentInstitution } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity, ReportCategory } from '../../domain/types';
import { resolvePrimaryReportIdentifier } from '../../common/utils/report-identifier';
import { toPlatformReport } from './reports.mapper';
import { ReportsService } from './reports.service';

class SubmitReportDto {
  fullName?: string;
  bank?: string;
  accountNumber?: string;
  phone?: string;
  email?: string;
  bvn?: string;
  nin?: string;
  category!: ReportCategory;
  description!: string;
  incidentDate!: string;
  amountInvolved?: number;
}

@Controller('platform/reports')
export class PlatformReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  async submit(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: SubmitReportDto,
  ) {
    const fieldErrors: Record<string, string> = {};
    const primary = resolvePrimaryReportIdentifier(body);
    if (!primary) {
      fieldErrors.identifier =
        'At least one identifier is required (account, phone, email, BVN, or NIN).';
    }

    if (!body.category) fieldErrors.category = 'Report category is required.';
    if (!body.description?.trim() || body.description.trim().length < 10) {
      fieldErrors.description =
        'Please provide a short description (at least 10 characters).';
    }
    if (!body.incidentDate) {
      fieldErrors.incidentDate = 'Incident date is required.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        success: false,
        error: 'Please fix the highlighted fields.',
        fieldErrors,
      };
    }

    const identifierType = primary!.identifierType;
    const identifier = primary!.identifier;
    const email = body.email?.trim() ?? 'unknown@rain.internal';

    const record = await this.reports.create(institution, {
      identifierType,
      identifier,
      email,
      category: body.category,
      description: body.description.trim(),
      incidentDate: body.incidentDate,
      fullName: body.fullName,
      bank: body.bank,
      accountNumber: body.accountNumber,
      phone: body.phone,
      amountInvolved: body.amountInvolved,
    });

    return { success: true, report: toPlatformReport(record) };
  }

  @Get()
  async list(
    @CurrentInstitution() institution: InstitutionEntity,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
    @Query('confidence') confidence?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const resultPage = await this.reports.list(institution.id, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      category,
      confidence,
      search,
      dateFrom,
      dateTo,
    });

    return {
      data: resultPage.data.map(toPlatformReport),
      total: resultPage.total,
      page: resultPage.page,
      pageSize: resultPage.pageSize,
      totalPages: resultPage.totalPages,
    };
  }

  @Get(':idOrRef')
  async getOne(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('idOrRef') idOrRef: string,
  ) {
    const record = await this.reports.getOne(institution.id, idOrRef);
    if (!record) return null;
    return toPlatformReport(record);
  }
}
