import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentInstitution } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity, ReportCategory } from '../../domain/types';
import { toApiReport } from './reports.mapper';
import { ReportsService } from './reports.service';

const CATEGORIES: ReportCategory[] = [
  'fraud',
  'scam',
  'mule_account',
  'identity_theft',
  'chargeback_abuse',
  'loan_fraud',
  'suspicious_transaction',
  'other',
];

class CreateReportDto {
  identifier_type!: 'bvn' | 'nin';
  identifier!: string;
  email!: string;
  category!: ReportCategory;
  description!: string;
  incident_date!: string;
  full_name?: string;
  bank?: string;
  account_number?: string;
  phone?: string;
  amount_involved?: number;
}

@Controller('v1/reports')
export class V1ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  async create(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: CreateReportDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const fieldErrors: Record<string, string> = {};

    if (!body.identifier_type || !['bvn', 'nin'].includes(body.identifier_type)) {
      fieldErrors.identifier_type = 'identifier_type must be bvn or nin.';
    }
    if (!body.identifier?.trim()) {
      fieldErrors.identifier = 'Identifier is required.';
    }
    if (!body.email?.trim()) {
      fieldErrors.email = 'Email is required.';
    }
    if (!body.category || !CATEGORIES.includes(body.category)) {
      fieldErrors.category = 'Report category is required.';
    }
    if (!body.description?.trim() || body.description.trim().length < 10) {
      fieldErrors.description =
        'Please provide a short description (at least 10 characters).';
    }
    if (!body.incident_date) {
      fieldErrors.incident_date = 'Incident date is required.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new HttpException(
        {
          message: 'Please fix the highlighted fields.',
          field_errors: fieldErrors,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const record = await this.reports.create(
      institution,
      {
        identifierType: body.identifier_type,
        identifier: body.identifier,
        email: body.email,
        category: body.category,
        description: body.description.trim(),
        incidentDate: body.incident_date,
        fullName: body.full_name,
        bank: body.bank,
        accountNumber: body.account_number,
        phone: body.phone,
        amountInvolved: body.amount_involved,
      },
      idempotencyKey,
    );

    return toApiReport(record);
  }

  @Get()
  async list(
    @CurrentInstitution() institution: InstitutionEntity,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
    @Query('category') category?: string,
    @Query('confidence') confidence?: string,
    @Query('search') search?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
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
      data: resultPage.data.map(toApiReport),
      total: resultPage.total,
      page: resultPage.page,
      page_size: resultPage.pageSize,
      total_pages: resultPage.totalPages,
    };
  }

  @Get(':idOrRef')
  async getOne(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('idOrRef') idOrRef: string,
  ) {
    const record = await this.reports.getOne(institution.id, idOrRef);
    if (!record) {
      throw new NotFoundException('Report not found.');
    }
    return toApiReport(record);
  }
}
