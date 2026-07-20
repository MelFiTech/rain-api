import { Module } from '@nestjs/common';
import { EmailModule } from '../../providers/email/email.module';
import { MonnifyPaymentsModule } from '../../providers/payments/monnify/monnify.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { IntegrationSettingsGuard } from './integration-settings.guard';

@Module({
  imports: [MonnifyPaymentsModule, EmailModule],
  controllers: [SettingsController],
  providers: [SettingsService, IntegrationSettingsGuard],
  exports: [SettingsService],
})
export class SettingsModule {}
