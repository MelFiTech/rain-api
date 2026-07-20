import { Module } from '@nestjs/common';
import { InstitutionProvisioningService } from './institution-provisioning.service';

@Module({
  providers: [InstitutionProvisioningService],
  exports: [InstitutionProvisioningService],
})
export class OnboardingModule {}
