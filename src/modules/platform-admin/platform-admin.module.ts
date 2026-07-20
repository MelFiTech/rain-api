import { Module } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PlatformAdminGuard],
})
export class PlatformAdminModule {}
