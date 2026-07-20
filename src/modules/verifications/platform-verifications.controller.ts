import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentInstitution } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity } from '../../domain/types';
import { toPlatformVerification } from './verifications.mapper';
import { VerificationsService } from './verifications.service';

class PlatformVerifyDto {
  identifierType!: string;
  identifier!: string;
  bankCode?: string;
}

@Controller('platform/verifications')
export class PlatformVerificationsController {
  constructor(private readonly verifications: VerificationsService) {}

  @Post('verify')
  async verify(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: PlatformVerifyDto,
  ) {
    if (!body.identifier?.trim()) {
      return { status: 'error', message: 'Identifier is required.' };
    }
    if (body.identifierType === 'account_number' && !body.bankCode?.trim()) {
      return {
        status: 'error',
        message: 'Please select a bank for account number verification.',
      };
    }

    const identifierType = body.identifierType as
      | 'account_number'
      | 'phone'
      | 'email'
      | 'bvn'
      | 'nin';

    try {
      const record = await this.verifications.create(institution, {
        identifierType,
        identifier: body.identifier,
        email: 'platform@internal.rain',
      });
      return { status: 'success', data: toPlatformVerification(record) };
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
        const e = error as Error & { balance: number; cost: number };
        return {
          status: 'insufficient_balance',
          balance: e.balance,
          cost: e.cost,
        };
      }
      throw error;
    }
  }

  @Get('export')
  async exportCsv(
    @CurrentInstitution() institution: InstitutionEntity,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('result') result?: string,
    @Query('confidence') confidence?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const resultPage = await this.verifications.list(institution.id, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 1000,
      result,
      confidence,
      search,
      dateFrom,
      dateTo,
    });

    const header =
      'Reference,Identifier Type,Masked Identifier,Result,Confidence,Sources,Cost,Date';
    const rows = resultPage.data.map((v) => {
      const mapped = toPlatformVerification(v);
      return [
        mapped.reference,
        mapped.identifierType,
        mapped.maskedIdentifier,
        mapped.result,
        mapped.confidence?.label ?? 'N/A',
        mapped.independentSourceCount,
        mapped.amountCharged,
        mapped.createdAt,
      ].join(',');
    });

    return { csv: [header, ...rows].join('\n') };
  }

  @Get()
  async list(
    @CurrentInstitution() institution: InstitutionEntity,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('result') result?: string,
    @Query('confidence') confidence?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const resultPage = await this.verifications.list(institution.id, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      result,
      confidence,
      search,
      dateFrom,
      dateTo,
    });

    return {
      data: resultPage.data.map(toPlatformVerification),
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
    const record = await this.verifications.getOne(institution.id, idOrRef);
    if (!record) return null;
    return toPlatformVerification(record);
  }
}
