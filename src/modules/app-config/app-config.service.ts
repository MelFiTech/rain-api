import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_LOW_BALANCE_THRESHOLD,
  DEFAULT_REWARD_AMOUNT,
  DEFAULT_VERIFICATION_COST,
  DEFAULT_WALLET_FUNDING_FEE,
} from '../../common/constants';

export const CONFIG_KEYS = {
  walletFundingFee: 'wallet_funding_fee',
  verificationCost: 'verification_cost',
  rewardAmount: 'reward_amount',
  lowBalanceThreshold: 'low_balance_threshold',
} as const;

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletFundingFee(): Promise<number> {
    return this.getNumber(
      CONFIG_KEYS.walletFundingFee,
      DEFAULT_WALLET_FUNDING_FEE,
    );
  }

  async getVerificationCost(): Promise<number> {
    return this.getNumber(
      CONFIG_KEYS.verificationCost,
      DEFAULT_VERIFICATION_COST,
    );
  }

  async getRewardAmount(): Promise<number> {
    return this.getNumber(CONFIG_KEYS.rewardAmount, DEFAULT_REWARD_AMOUNT);
  }

  async getLowBalanceThreshold(): Promise<number> {
    return this.getNumber(
      CONFIG_KEYS.lowBalanceThreshold,
      DEFAULT_LOW_BALANCE_THRESHOLD,
    );
  }

  async getPricing() {
    const [walletFundingFee, verificationCost, rewardAmount] =
      await Promise.all([
        this.getWalletFundingFee(),
        this.getVerificationCost(),
        this.getRewardAmount(),
      ]);
    return { walletFundingFee, verificationCost, rewardAmount };
  }

  async setWalletFundingFee(amount: number) {
    await this.setNumber(CONFIG_KEYS.walletFundingFee, amount);
  }

  private async getNumber(key: string, fallback: number): Promise<number> {
    const row = await this.prisma.appConfig.findUnique({ where: { key } });
    if (!row) return fallback;
    const value = row.value as { amount?: number };
    return typeof value.amount === 'number' ? value.amount : fallback;
  }

  private async setNumber(key: string, amount: number) {
    await this.prisma.appConfig.upsert({
      where: { key },
      create: { key, value: { amount } },
      update: { value: { amount } },
    });
  }
}
