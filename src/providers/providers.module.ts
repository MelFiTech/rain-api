import { Module } from '@nestjs/common';
import { PaymentsProvidersModule } from './payments/payments.module';
import { WebhookProvidersModule } from './webhooks/webhooks-providers.module';

@Module({
  imports: [PaymentsProvidersModule, WebhookProvidersModule],
  exports: [PaymentsProvidersModule, WebhookProvidersModule],
})
export class ProvidersModule {}
