import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { VerificationsModule } from '../verifications/verifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PlatformReportsController } from './platform-reports.controller';
import { ReportsService } from './reports.service';
import { V1ReportsController } from './v1-reports.controller';

@Module({
  imports: [VerificationsModule, WebhooksModule, NotificationsModule],
  controllers: [V1ReportsController, PlatformReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
