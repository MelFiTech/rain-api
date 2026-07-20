import { Inject, Injectable } from '@nestjs/common';
import { generateReference as genRef } from '../../common/utils/ids';
import type { FundSessionEntity } from '../../domain/types';
import { MonnifyApiError } from '../../providers/payments/monnify/monnify-api.client';
import { PAYMENT_PROVIDER } from '../../providers/payments/interfaces/payment-provider.interface';
import type { PaymentProvider } from '../../providers/payments/interfaces/payment-provider.interface';
import {
  InstitutionRepository,
  WalletRepository,
} from '../../persistence';
import { AppConfigService } from '../app-config/app-config.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly wallet: WalletRepository,
    private readonly appConfig: AppConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    private readonly webhooks: WebhooksService,
  ) {}

  async getFundingQuote(creditAmount: number) {
    const fee = await this.appConfig.getWalletFundingFee();
    return {
      creditAmount,
      fee,
      transferAmount: creditAmount + fee,
    };
  }

  async getWalletState(institutionId: string) {
    const institution = await this.institutions.findById(institutionId);
    if (!institution) {
      throw new Error('Institution not found');
    }
    return {
      balance: institution.walletBalance,
      lowBalanceThreshold: institution.lowBalanceThreshold,
      transactions: await this.wallet.listTransactions(institutionId),
    };
  }

  async chargeVerification(institutionId: string, amount: number) {
    const institution = await this.institutions.findById(institutionId);
    if (!institution) throw new Error('Institution not found');

    const updated = await this.institutions.adjustWalletBalance(institutionId, -amount, {
      type: 'verification_charge',
      amount: -Math.abs(amount),
      balanceAfter: institution.walletBalance - amount,
      description: 'User verification',
      reference: genRef('CHG'),
      createdAt: new Date().toISOString(),
    });

    await this.maybeEmitLowBalance(institutionId, updated.walletBalance);
  }

  async credit(
    institutionId: string,
    amount: number,
    type: 'funding' | 'reward_credit' | 'adjustment',
    description: string,
  ) {
    const institution = await this.institutions.findById(institutionId);
    if (!institution) throw new Error('Institution not found');

    await this.institutions.adjustWalletBalance(institutionId, amount, {
      type,
      amount: Math.abs(amount),
      balanceAfter: institution.walletBalance + amount,
      description,
      reference: genRef(type === 'funding' ? 'FND' : 'RWD'),
      createdAt: new Date().toISOString(),
    });
  }

  async createFundSession(institutionId: string, creditAmount: number) {
    if (!creditAmount || creditAmount < 100) {
      return { success: false as const, error: 'Minimum funding amount is ₦100.' };
    }
    if (creditAmount > 5_000_000) {
      return {
        success: false as const,
        error: 'Maximum funding amount is ₦5,000,000.',
      };
    }

    const institution = await this.institutions.findById(institutionId);
    if (!institution) {
      return { success: false as const, error: 'Institution not found.' };
    }

    const quote = await this.getFundingQuote(creditAmount);
    const reference = genRef('FND');

    try {
      const session = await this.payments.createFundSession({
        institutionId,
        customerEmail: institution.email,
        creditAmount: quote.creditAmount,
        fee: quote.fee,
        transferAmount: quote.transferAmount,
        reference,
      });
      return { success: true as const, session: this.toPlatformSession(session) };
    } catch (error) {
      const message =
        error instanceof MonnifyApiError
          ? error.message
          : 'Could not start Monnify checkout. Try again shortly.';
      return { success: false as const, error: message };
    }
  }

  async getFundSession(
    institutionId: string,
    sessionId: string,
  ): Promise<ReturnType<WalletService['toPlatformSession']> | null> {
    const session = await this.payments.syncFundSessionStatus(sessionId);
    if (!session || session.institutionId !== institutionId) return null;
    if (session.status === 'paid') {
      await this.applyFundSessionPayment(sessionId);
    }
    const latest = (await this.wallet.findFundSessionById(sessionId)) ?? session;
    return this.toPlatformSession(latest);
  }

  async confirmFundSession(institutionId: string, sessionId: string) {
    const session = await this.payments.syncFundSessionStatus(sessionId);
    if (!session || session.institutionId !== institutionId) {
      return {
        success: false as const,
        error: 'This payment session was not found.',
      };
    }

    if (session.status === 'expired') {
      return {
        success: false as const,
        error: 'This account has expired. Start a new funding request.',
        status: 'expired' as const,
      };
    }

    if (session.status === 'paid') {
      await this.applyFundSessionPayment(sessionId);
      const institution = await this.institutions.findById(institutionId);
      return {
        success: true as const,
        balance: institution!.walletBalance,
        reference: session.reference,
      };
    }

    return {
      success: false as const,
      error:
        'Payment not confirmed yet. Complete the transfer, then check again in a moment.',
      status: 'pending' as const,
    };
  }

  /** Idempotent credit after Monnify reports PAID (poll or webhook). */
  async applyFundSessionPayment(sessionId: string): Promise<boolean> {
    const session = await this.wallet.findFundSessionById(sessionId);
    if (!session || session.status !== 'paid') return false;

    const alreadyCredited = await this.wallet.hasFundingForSessionReference(
      session.institutionId,
      session.reference,
    );
    if (alreadyCredited) return false;

    await this.credit(
      session.institutionId,
      session.creditAmount,
      'funding',
      `Wallet funding via Monnify · ${session.accountNumber} · ${session.reference}`,
    );
    return true;
  }

  toPlatformSession(session: FundSessionEntity) {
    return {
      id: session.id,
      reference: session.reference,
      amount: session.amount,
      creditAmount: session.creditAmount,
      fee: session.fee,
      bankName: session.bankName,
      accountNumber: session.accountNumber,
      accountName: session.accountName,
      expiresAt: session.expiresAt,
      status: session.status,
      checkoutUrl: session.checkoutUrl,
    };
  }

  private async maybeEmitLowBalance(institutionId: string, balance: number) {
    const institution = await this.institutions.findById(institutionId);
    if (
      institution &&
      balance < institution.lowBalanceThreshold
    ) {
      void this.webhooks.emitWalletLowBalance(institutionId, balance);
    }
  }
}
