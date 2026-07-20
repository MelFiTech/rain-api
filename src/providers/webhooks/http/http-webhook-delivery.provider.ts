import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import type {
  WebhookDeliveryPayload,
  WebhookDeliveryProvider,
  WebhookDeliveryTarget,
} from '../interfaces/webhook-delivery.interface';

@Injectable()
export class HttpWebhookDeliveryProvider implements WebhookDeliveryProvider {
  readonly name = 'http';
  private readonly logger = new Logger(HttpWebhookDeliveryProvider.name);

  async deliver(
    target: WebhookDeliveryTarget,
    payload: WebhookDeliveryPayload,
  ): Promise<{ success: boolean }> {
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', target.secret).update(body).digest('hex');

    try {
      const response = await fetch(target.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Rain-Signature': signature,
        },
        body,
      });
      const success = response.ok;
      if (!success) {
        this.logger.warn(
          `Webhook delivery failed (${response.status}) → ${target.url}`,
        );
      }
      return { success };
    } catch (error) {
      this.logger.warn(`Webhook delivery error → ${target.url}`, error);
      return { success: false };
    }
  }
}
