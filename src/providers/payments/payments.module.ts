import { Module } from '@nestjs/common';
import { MonnifyPaymentsModule } from './monnify/monnify.module';

@Module({
  imports: [MonnifyPaymentsModule],
  exports: [MonnifyPaymentsModule],
})
export class PaymentsProvidersModule {}
