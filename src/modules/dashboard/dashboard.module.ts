import { Module } from '@nestjs/common';
import { EarningsModule } from '../earnings/earnings.module';
import { NetworkModule } from '../network/network.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [EarningsModule, NetworkModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
