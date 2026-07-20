import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateId } from '../../common/utils/ids';
import { MonnifyApiClient } from '../../providers/payments/monnify/monnify-api.client';
import {
  EarningsRepository,
  WalletRepository,
} from '../../persistence';
import { EarningsService } from '../earnings/earnings.service';
import { WalletService } from './wallet.service';

export interface MonnifyWebhookPayload {
  eventType?: string;
  eventData?: Record<string, unknown>;
}

@Injectable()
export class MonnifyWebhookService {
  private readonly logger = new Logger(MonnifyWebhookService.name);

  constructor(
    private readonly earningsRepo: EarningsRepository,
    private readonly walletRepo: WalletRepository,
    private readonly wallet: WalletService,
    private readonly earnings: EarningsService,
    private readonly monnify: MonnifyApiClient,
    private readonly config: ConfigService,
  ) {}

  assertAllowedSourceIp(clientIp: string | undefined) {
    const enforce = this.config.get<boolean>(
      'payments.monnify.webhookEnforceIp',
    );
    if (!enforce) return;

    const allowed =
      this.config.get<string[]>('payments.monnify.webhookAllowedIps') ?? [];
    if (allowed.length === 0) return;

    const ip = (clientIp ?? '').split(',')[0]?.trim();
    if (!ip || !allowed.includes(ip)) {
      throw new Error(`Monnify webhook rejected from IP ${ip ?? 'unknown'}.`);
    }
  }

  verifySignature(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    parsedBody: Record<string, unknown>,
  ): boolean {
    if (rawBody && signature) {
      if (this.monnify.verifyWebhookSignature(rawBody, signature)) {
        return true;
      }
      if (this.monnify.verifyWebhookSignatureLegacy(parsedBody, signature)) {
        this.logger.warn('Monnify webhook matched legacy hash format.');
        return true;
      }
      return false;
    }

    if (!signature && !this.monnify.shouldRequireWebhookSignature()) {
      this.logger.debug(
        'Monnify webhook accepted without signature (sandbox / non-production).',
      );
      return true;
    }

    return false;
  }

  async processPayload(payload: MonnifyWebhookPayload) {
    const eventType = String(payload.eventType ?? '').toUpperCase();
    const eventData = (payload.eventData ?? {}) as Record<string, unknown>;

    const dedupeKey = this.buildDedupeKey(eventType, eventData);
    if (!dedupeKey) {
      this.logger.warn(`Monnify webhook ${eventType} missing dedupe key`);
      return;
    }

    const claimed = await this.earningsRepo.claimMonnifyWebhookEvent({
      id: generateId('mwr'),
      dedupeKey,
      eventType: eventType || 'UNKNOWN',
    });
    if (!claimed) {
      this.logger.debug(`Duplicate Monnify webhook ignored: ${dedupeKey}`);
      return;
    }

    switch (eventType) {
      case 'SUCCESSFUL_TRANSACTION':
        await this.handleSuccessfulTransaction(eventData);
        break;
      case 'SUCCESSFUL_DISBURSEMENT':
      case 'FAILED_DISBURSEMENT':
      case 'REVERSED_DISBURSEMENT':
        await this.handleDisbursement(eventType, eventData);
        break;
      default:
        this.logger.log(`Monnify webhook acknowledged: ${eventType}`);
    }
  }

  private buildDedupeKey(
    eventType: string,
    eventData: Record<string, unknown>,
  ): string | null {
    const transactionReference = String(
      eventData.transactionReference ?? '',
    ).trim();
    const reference = String(eventData.reference ?? '').trim();
    const paymentReference = String(eventData.paymentReference ?? '').trim();
    const key =
      transactionReference || reference || paymentReference || '';
    if (!key) return null;
    return `${eventType}:${key}`;
  }

  private async handleSuccessfulTransaction(eventData: Record<string, unknown>) {
    const paymentReference = String(
      eventData.paymentReference ?? eventData.payment_reference ?? '',
    ).trim();
    const transactionReference = String(
      eventData.transactionReference ?? '',
    ).trim();
    const paymentStatus = String(
      eventData.paymentStatus ?? eventData.payment_status ?? '',
    ).toUpperCase();

    if (paymentStatus !== 'PAID' && paymentStatus !== 'OVERPAID') {
      return;
    }

    const session =
      (paymentReference
        ? await this.walletRepo.findFundSessionByPaymentReference(paymentReference)
        : null) ??
      (transactionReference
        ? await this.walletRepo.findFundSessionByTransactionReference(
            transactionReference,
          )
        : null);

    if (!session) return;

    if (session.status !== 'paid') {
      session.status = 'paid';
      await this.walletRepo.saveFundSession(session);
    }

    await this.wallet.applyFundSessionPayment(session.id);
  }

  private async handleDisbursement(
    eventType: string,
    eventData: Record<string, unknown>,
  ) {
    const reference = String(eventData.reference ?? '').trim();
    if (!reference) return;

    await this.earnings.handleDisbursementWebhook({
      eventType,
      reference,
      monnifyStatus: String(eventData.status ?? ''),
      transactionDescription: String(
        eventData.transactionDescription ?? '',
      ),
    });
  }
}
