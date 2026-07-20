import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WEBHOOK_DELIVERY_PROVIDER } from '../interfaces/webhook-delivery.interface';
import { HttpWebhookDeliveryProvider } from './http-webhook-delivery.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    HttpWebhookDeliveryProvider,
    {
      provide: WEBHOOK_DELIVERY_PROVIDER,
      useFactory: (
        config: ConfigService,
        http: HttpWebhookDeliveryProvider,
      ) => {
        const selected = config.get<string>(
          'webhookDelivery.defaultProvider',
          'http',
        );
        if (selected === 'http') return http;
        return http;
      },
      inject: [ConfigService, HttpWebhookDeliveryProvider],
    },
  ],
  exports: [WEBHOOK_DELIVERY_PROVIDER, HttpWebhookDeliveryProvider],
})
export class HttpWebhookDeliveryModule {}
