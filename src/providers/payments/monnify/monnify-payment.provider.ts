import { Injectable, Logger } from '@nestjs/common';
import { MONNIFY_CHECKOUT_TTL_SECONDS } from '../../../common/constants';
import { generateId } from '../../../common/utils/ids';
import type { FundSessionEntity } from '../../../domain/types';
import { WalletRepository } from '../../../persistence';
import type {
  CreateFundSessionInput,
  PaymentProvider,
} from '../interfaces/payment-provider.interface';
import { MonnifyApiClient, MonnifyApiError } from './monnify-api.client';

@Injectable()
export class MonnifyPaymentProvider implements PaymentProvider {
  readonly name = 'monnify';
  private readonly logger = new Logger(MonnifyPaymentProvider.name);

  constructor(
    private readonly wallet: WalletRepository,
    private readonly monnify: MonnifyApiClient,
  ) {}

  async createFundSession(
    input: CreateFundSessionInput,
  ): Promise<FundSessionEntity> {
    if (!this.monnify.isConfigured()) {
      throw new MonnifyApiError(
        'Monnify is not configured. Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE in .env.',
      );
    }

    const checkout = await this.monnify.initWalletCheckout({
      transferAmount: input.transferAmount,
      paymentReference: input.reference,
      customerEmail: input.customerEmail,
      paymentDescription: `Rain wallet funding · ${input.reference}`,
    });

    const durationSeconds =
      checkout.bankTransfer.accountDurationSeconds ??
      MONNIFY_CHECKOUT_TTL_SECONDS;

    const session: FundSessionEntity = {
      id: generateId('mfy'),
      institutionId: input.institutionId,
      reference: input.reference,
      amount: input.transferAmount,
      creditAmount: input.creditAmount,
      fee: input.fee,
      bankName: checkout.bankTransfer.bankName,
      accountNumber: checkout.bankTransfer.accountNumber,
      accountName: checkout.bankTransfer.accountName,
      expiresAt: new Date(Date.now() + durationSeconds * 1000).toISOString(),
      status: 'pending',
      provider: this.name,
      transactionReference: checkout.transactionReference,
      checkoutUrl: checkout.checkoutUrl,
    };

    await this.wallet.saveFundSession(session);
    return session;
  }

  async getFundSession(sessionId: string): Promise<FundSessionEntity | null> {
    const session = await this.wallet.findFundSessionById(sessionId);
    if (!session) return null;
    await this.refreshExpiry(session);
    return { ...session };
  }

  async syncFundSessionStatus(
    sessionId: string,
  ): Promise<FundSessionEntity | null> {
    const session = await this.wallet.findFundSessionById(sessionId);
    if (!session) return null;

    await this.refreshExpiry(session);
    if (session.status !== 'pending') {
      return { ...session };
    }

    if (!session.transactionReference) {
      return { ...session };
    }

    try {
      const status = await this.monnify.getTransactionStatus(
        session.transactionReference,
      );
      const paymentStatus = status.paymentStatus?.toUpperCase() ?? '';

      if (paymentStatus === 'PAID' || paymentStatus === 'OVERPAID') {
        session.status = 'paid';
      } else if (
        paymentStatus === 'EXPIRED' ||
        paymentStatus === 'FAILED' ||
        paymentStatus === 'CANCELLED'
      ) {
        session.status = 'expired';
      }
    } catch (error) {
      this.logger.warn(
        `Could not sync Monnify status for session ${sessionId}`,
        error,
      );
    }

    await this.wallet.saveFundSession(session);
    return { ...session };
  }

  private async refreshExpiry(session: FundSessionEntity) {
    if (session.status !== 'pending') return;
    if (new Date(session.expiresAt) <= new Date()) {
      session.status = 'expired';
      await this.wallet.saveFundSession(session);
    }
  }
}
