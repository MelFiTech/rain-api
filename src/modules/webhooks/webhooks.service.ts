import { Inject, Injectable } from '@nestjs/common';
import { generateId } from '../../common/utils/ids';
import type {
  ReportEntity,
  VerificationEntity,
  WebhookEventType,
} from '../../domain/types';
import { WEBHOOK_DELIVERY_PROVIDER } from '../../providers/webhooks/interfaces/webhook-delivery.interface';
import type { WebhookDeliveryProvider } from '../../providers/webhooks/interfaces/webhook-delivery.interface';
import { WebhookRepository } from '../../persistence';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly webhooks: WebhookRepository,
    @Inject(WEBHOOK_DELIVERY_PROVIDER)
    private readonly delivery: WebhookDeliveryProvider,
  ) {}

  async emitVerificationCompleted(
    institutionId: string,
    verification: VerificationEntity,
  ) {
    await this.dispatch(institutionId, 'verification.completed', {
      reference: verification.reference,
      result: verification.result,
      masked_identifier: verification.maskedIdentifier,
      confidence: verification.confidence
        ? {
            level: verification.confidence.level,
            independent_source_count:
              verification.confidence.independent_source_count,
          }
        : null,
    });
  }

  async emitReportSubmitted(institutionId: string, report: ReportEntity) {
    await this.dispatch(institutionId, 'report.submitted', {
      reference: report.reference,
      category: report.category,
      masked_identifier: report.maskedIdentifier,
    });
  }

  async emitWalletLowBalance(institutionId: string, balance: number) {
    await this.dispatch(institutionId, 'wallet.low_balance', { balance });
  }

  private async dispatch(
    institutionId: string,
    type: WebhookEventType,
    data: Record<string, unknown>,
  ) {
    const endpoints = (await this.webhooks.listForInstitution(institutionId)).filter(
      (e) => e.enabled && e.events.includes(type),
    );

    const payload = {
      id: generateId('evt'),
      type,
      created_at: new Date().toISOString(),
      data,
    };

    for (const endpoint of endpoints) {
      const result = await this.delivery.deliver(
        { url: endpoint.url, secret: endpoint.secret },
        payload,
      );
      endpoint.lastDeliveryAt = new Date().toISOString();
      endpoint.lastDeliveryStatus = result.success ? 'success' : 'failed';
      await this.webhooks.save(endpoint);
    }
  }
}
