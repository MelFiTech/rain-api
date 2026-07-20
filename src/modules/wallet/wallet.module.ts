import { Module, forwardRef } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { AuthModule } from '../auth/auth.module';
import { EarningsModule } from '../earnings/earnings.module';
import { ProvidersModule } from '../../providers/providers.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PlatformWalletController } from './platform-wallet.controller';
import { MonnifyWebhookController } from './monnify-webhook.controller';
import { MonnifyWebhookService } from './monnify-webhook.service';
import { WalletRealtimeGateway } from './wallet-realtime.gateway';
import { WalletRealtimeService } from './wallet-realtime.service';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    ProvidersModule,
    forwardRef(() => WebhooksModule),
    forwardRef(() => EarningsModule),
  ],
  controllers: [PlatformWalletController, MonnifyWebhookController],
  providers: [
    WalletService,
    MonnifyWebhookService,
    WalletRealtimeService,
    WalletRealtimeGateway,
  ],
  exports: [WalletService, WalletRealtimeService],
})
export class WalletModule {}
