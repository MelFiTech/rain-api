import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { EmailModule } from '../../providers/email/email.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AccessRequestsAdminController } from './access-requests-admin.controller';
import { AccessRequestsAdminService } from './access-requests-admin.service';
import { AccessRequestsController } from './access-requests.controller';
import { AccessRequestsService } from './access-requests.service';

@Module({
  imports: [ConfigModule, EmailModule, OnboardingModule],
  controllers: [AccessRequestsController, AccessRequestsAdminController],
  providers: [
    AccessRequestsService,
    AccessRequestsAdminService,
    PlatformAdminGuard,
  ],
})
export class AccessRequestsModule {}
