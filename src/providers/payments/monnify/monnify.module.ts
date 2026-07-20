import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER } from '../interfaces/payment-provider.interface';
import { MonnifyApiClient } from './monnify-api.client';
import { MonnifyPaymentProvider } from './monnify-payment.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    MonnifyApiClient,
    MonnifyPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (
        config: ConfigService,
        monnify: MonnifyPaymentProvider,
      ) => {
        const selected = config.get<string>('payments.defaultProvider', 'monnify');
        if (selected === 'monnify') return monnify;
        return monnify;
      },
      inject: [ConfigService, MonnifyPaymentProvider],
    },
  ],
  exports: [PAYMENT_PROVIDER, MonnifyPaymentProvider, MonnifyApiClient],
})
export class MonnifyPaymentsModule {}
