import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { generateId } from '../../common/utils/ids';
import { extractMonnifyPayerFromEventData } from '../../common/utils/monnify-payer';
import { MonnifyApiClient } from '../../providers/payments/monnify/monnify-api.client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EarningsRepository,
  WalletRepository,
} from '../../persistence';
import { EarningsService } from '../earnings/earnings.service';
import { WalletService } from './wallet.service';
import { WalletRealtimeService } from './wallet-realtime.service';

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
    private readonly walletRealtime: WalletRealtimeService,
    private readonly earnings: EarningsService,
    private readonly monnify: MonnifyApiClient,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
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
    const requireSignature = this.monnify.shouldRequireWebhookSignature();

    if (signature?.trim() && rawBody?.length) {
      if (this.monnify.verifyWebhookSignature(rawBody, signature)) {
        return true;
      }
      if (this.monnify.verifyWebhookSignatureLegacyRaw(rawBody, signature)) {
        return true;
      }
      if (this.monnify.verifyWebhookSignatureLegacy(parsedBody, signature)) {
        this.logger.warn(
          'Monnify webhook matched legacy hash from parsed JSON (prefer raw body).',
        );
        return true;
      }
      this.logger.warn('Monnify webhook signature did not match');
      return false;
    }

    if (signature?.trim() && !rawBody?.length) {
      this.logger.warn('Monnify webhook missing raw body for signature check');
      return false;
    }

    if (!signature?.trim() && !requireSignature) {
      this.logger.debug(
        'Monnify webhook accepted without signature (sandbox / optional mode).',
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
      await this.recordWebhookLog(payload, eventType, null, false);
      return;
    }

    const claimed = await this.earningsRepo.claimMonnifyWebhookEvent({
      id: generateId('mwr'),
      dedupeKey,
      eventType: eventType || 'UNKNOWN',
    });

    await this.recordWebhookLog(payload, eventType, dedupeKey, !claimed);

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
    }

    const payerDetails = extractMonnifyPayerFromEventData(eventData);
    if (payerDetails) {
      session.payerDetails = payerDetails;
    }

    await this.walletRepo.saveFundSession(session);

    await this.wallet.applyFundSessionPayment(session.id);
    this.walletRealtime.notifyFundSessionPaid(
      session.institutionId,
      session.id,
    );
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

  private async recordWebhookLog(
    payload: MonnifyWebhookPayload,
    eventType: string,
    dedupeKey: string | null,
    duplicate: boolean,
  ) {
    try {
      await this.prisma.monnifyWebhookLog.create({
        data: {
          id: generateId('mwl'),
          eventType: eventType || 'UNKNOWN',
          dedupeKey,
          duplicate,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to persist Monnify webhook log',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
