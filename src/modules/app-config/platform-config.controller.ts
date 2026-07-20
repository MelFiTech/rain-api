import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import type { UserEntity } from '../../domain/types';
import { AppConfigService } from './app-config.service';

@Controller('platform/config')
export class PlatformConfigController {
  constructor(private readonly config: AppConfigService) {}

  @Get('pricing')
  getPricing() {
    return this.config.getPricing();
  }

  @Patch('pricing')
  async updatePricing(
    @CurrentUser() user: UserEntity,
    @Body() body: { walletFundingFee?: number },
  ) {
    if (user.role !== 'administrator') {
      return { success: false, error: 'Only administrators can change pricing.' };
    }
    if (
      body.walletFundingFee === undefined ||
      body.walletFundingFee < 0 ||
      body.walletFundingFee > 50_000
    ) {
      return {
        success: false,
        error: 'walletFundingFee must be between 0 and 50000.',
      };
    }
    await this.config.setWalletFundingFee(body.walletFundingFee);
    return { success: true, pricing: await this.config.getPricing() };
  }
}
