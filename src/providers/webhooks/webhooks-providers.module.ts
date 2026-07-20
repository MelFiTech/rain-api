import { Module } from '@nestjs/common';
import { HttpWebhookDeliveryModule } from './http/http-webhook.module';

@Module({
  imports: [HttpWebhookDeliveryModule],
  exports: [HttpWebhookDeliveryModule],
})
export class WebhookProvidersModule {}
