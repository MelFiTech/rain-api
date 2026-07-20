import { Module } from '@nestjs/common';
import { PlatformCustomersService } from './platform-customers.service';

@Module({
  providers: [PlatformCustomersService],
  exports: [PlatformCustomersService],
})
export class PlatformCustomersModule {}
