import { Module } from '@nestjs/common';
import { PlatformCustomersModule } from '../platform-customers/platform-customers.module';
import { PlatformCheckController } from './platform-check.controller';

@Module({
  imports: [PlatformCustomersModule],
  controllers: [PlatformCheckController],
})
export class PlatformCheckModule {}
