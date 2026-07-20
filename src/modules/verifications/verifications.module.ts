import { Module, forwardRef } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { EarningsModule } from '../earnings/earnings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformCustomersModule } from '../platform-customers/platform-customers.module';
import { WalletModule } from '../wallet/wallet.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { IdempotencyService } from './idempotency.service';
import { VerificationsService } from './verifications.service';
import { V1VerificationsController } from './v1-verifications.controller';
import { PlatformVerificationsController } from './platform-verifications.controller';

@Module({
  imports: [
    AppConfigModule,
    forwardRef(() => WalletModule),
    WebhooksModule,
    NotificationsModule,
    PlatformCustomersModule,
    EarningsModule,
  ],
  controllers: [V1VerificationsController, PlatformVerificationsController],
  providers: [VerificationsService, IdempotencyService],
  exports: [VerificationsService, IdempotencyService],
})
export class VerificationsModule {}
