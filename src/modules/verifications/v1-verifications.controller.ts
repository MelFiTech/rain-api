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
import type { InstitutionEntity } from '../../domain/types';
import { toApiVerification } from './verifications.mapper';
import { VerificationsService } from './verifications.service';

class CreateVerificationDto {
  identifier_type!: 'bvn' | 'nin';
  identifier!: string;
  email!: string;
  phone?: string;
  account_number?: string;
  bank_code?: string;
  full_name?: string;
}

@Controller('v1/verifications')
export class V1VerificationsController {
  constructor(private readonly verifications: VerificationsService) {}

  @Post()
  async create(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: CreateVerificationDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!body.identifier_type || !['bvn', 'nin'].includes(body.identifier_type)) {
      throw new HttpException(
        {
          message: 'identifier_type must be bvn or nin.',
          field_errors: {
            identifier_type: 'identifier_type must be bvn or nin.',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!body.identifier?.trim()) {
      throw new HttpException(
        {
          message: 'Please fix the highlighted fields.',
          field_errors: { identifier: 'Identifier is required.' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!body.email?.trim()) {
      throw new HttpException(
        {
          message: 'Please fix the highlighted fields.',
          field_errors: { email: 'Email is required.' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      const record = await this.verifications.create(
        institution,
        {
          identifierType: body.identifier_type,
          identifier: body.identifier,
          email: body.email,
          phone: body.phone,
          accountNumber: body.account_number,
          bankCode: body.bank_code,
          fullName: body.full_name,
        },
        idempotencyKey,
      );
      return toApiVerification(record);
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
        const e = error as Error & { balance: number; cost: number };
        throw new HttpException(
          {
            message: 'Insufficient wallet balance.',
            code: 'insufficient_balance',
            balance: e.balance,
            cost: e.cost,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      throw error;
    }
  }

  @Get()
  async list(
    @CurrentInstitution() institution: InstitutionEntity,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
    @Query('result') result?: string,
    @Query('confidence') confidence?: string,
    @Query('search') search?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
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
      data: resultPage.data.map(toApiVerification),
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
    const record = await this.verifications.getOne(institution.id, idOrRef);
    if (!record) {
      throw new NotFoundException('Verification not found.');
    }
    return toApiVerification(record);
  }
}
