import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentInstitution } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity } from '../../domain/types';
import { WithdrawEarningsDto } from './dto/withdraw-earnings.dto';
import { EarningsService } from './earnings.service';

@Controller('platform/earnings')
export class EarningsController {
  constructor(private readonly earnings: EarningsService) {}

  @Get()
  summary(@CurrentInstitution() institution: InstitutionEntity) {
    return this.earnings.getSummary(institution.id);
  }

  @Post('withdraw')
  withdraw(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: WithdrawEarningsDto,
  ) {
    return this.earnings.withdraw(
      institution.id,
      body.amount,
      body.destination,
    );
  }

  @Get('withdrawals/:reference/status')
  withdrawalStatus(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('reference') reference: string,
  ) {
    return this.earnings.syncBankWithdrawalStatus(institution.id, reference);
  }
}
