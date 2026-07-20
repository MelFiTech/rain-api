import { Module, forwardRef } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { EmailModule } from '../../providers/email/email.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { MonnifyPaymentsModule } from '../../providers/payments/monnify/monnify.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { EarningsAdminController } from './earnings-admin.controller';
import { EarningsController } from './earnings.controller';
import { EarningsWithdrawalProcessor } from './earnings-withdrawal.processor';
import { EarningsService } from './earnings.service';

@Module({
  imports: [
    AppConfigModule,
    forwardRef(() => WalletModule),
    NotificationsModule,
    MonnifyPaymentsModule,
    EmailModule,
  ],
  controllers: [EarningsController, EarningsAdminController],
  providers: [EarningsService, EarningsWithdrawalProcessor, PlatformAdminGuard],
  exports: [EarningsService],
})
export class EarningsModule {}
