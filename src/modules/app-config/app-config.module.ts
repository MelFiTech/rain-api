import { Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { PlatformConfigController } from './platform-config.controller';
import { PublicConfigController } from './public-config.controller';

@Module({
  controllers: [PlatformConfigController, PublicConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
