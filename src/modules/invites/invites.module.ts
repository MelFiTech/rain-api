import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { EmailModule } from '../../providers/email/email.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [OnboardingModule, EmailModule, forwardRef(() => AuthModule)],
  controllers: [InvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
