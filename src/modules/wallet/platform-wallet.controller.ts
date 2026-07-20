import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { CurrentInstitution } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity } from '../../domain/types';
import { WalletService } from './wallet.service';

class FundWalletDto {
  @Type(() => Number)
  @IsInt()
  @Min(100, { message: 'Minimum funding amount is ₦100.' })
  @Max(5_000_000, { message: 'Maximum funding amount is ₦5,000,000.' })
  amount!: number;
}

@Controller('platform/wallet')
export class PlatformWalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  async fetch(@CurrentInstitution() institution: InstitutionEntity) {
    const state = await this.wallet.getWalletState(institution.id);
    return {
      balance: state.balance,
      lowBalanceThreshold: state.lowBalanceThreshold,
      transactions: state.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        reference: t.reference,
        createdAt: t.createdAt,
      })),
    };
  }

  @Get('fund/quote')
  async quote(@Query('amount') amount?: string) {
    const creditAmount = amount ? parseInt(amount, 10) : 0;
    if (!creditAmount || Number.isNaN(creditAmount)) {
      return { creditAmount: 0, fee: 0, transferAmount: 0 };
    }
    return this.wallet.getFundingQuote(creditAmount);
  }

  @Post('fund/monnify')
  createMonnifySession(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: FundWalletDto,
  ) {
    return this.wallet.createFundSession(institution.id, body.amount);
  }

  @Post('fund/sessions')
  createFundSessionAlias(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: FundWalletDto,
  ) {
    return this.wallet.createFundSession(institution.id, body.amount);
  }

  @Get('fund/monnify/:sessionId')
  getMonnifySession(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('sessionId') sessionId: string,
  ) {
    return this.wallet.getFundSession(institution.id, sessionId);
  }

  @Get('fund/sessions/:sessionId')
  getFundSessionAlias(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('sessionId') sessionId: string,
  ) {
    return this.wallet.getFundSession(institution.id, sessionId);
  }

  @Post('fund/monnify/:sessionId/confirm')
  confirmMonnifySession(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('sessionId') sessionId: string,
  ) {
    return this.wallet.confirmFundSession(institution.id, sessionId);
  }

  @Post('fund/sessions/:sessionId/confirm')
  confirmFundSessionAlias(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('sessionId') sessionId: string,
  ) {
    return this.wallet.confirmFundSession(institution.id, sessionId);
  }
}
