import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import configuration from './config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { DevHttpLoggingInterceptor } from './common/interceptors/dev-http-logging.interceptor';
import { ProvidersModule } from './providers/providers.module';
import { PersistenceModule } from './persistence/persistence.module';
import { ApiKeyGuard } from './modules/api-keys/guards/api-key.guard';
import { AuthModule } from './modules/auth/auth.module';
import { PlatformAuthGuard } from './modules/auth/platform-auth.guard';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { ReportsModule } from './modules/reports/reports.module';
import { VerificationsModule } from './modules/verifications/verifications.module';
import { WalletModule } from './modules/wallet/wallet.module';

import { NotificationsModule } from './modules/notifications/notifications.module';
import { TeamModule } from './modules/team/team.module';
import { SettingsModule } from './modules/settings/settings.module';
import { EarningsModule } from './modules/earnings/earnings.module';
import { PlatformCheckModule } from './modules/platform-check/platform-check.module';
import { PrismaModule } from './prisma/prisma.module';
import { AccessRequestsModule } from './modules/access-requests/access-requests.module';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    PersistenceModule,
    AppConfigModule,
    ProvidersModule,
    AuthModule,
    AccessRequestsModule,
    HealthModule,
    DashboardModule,
    WalletModule,
    VerificationsModule,
    ReportsModule,
    NotificationsModule,
    TeamModule,
    SettingsModule,
    EarningsModule,
    PlatformAdminModule,
    PlatformCheckModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: DevHttpLoggingInterceptor },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: PlatformAuthGuard },
  ],
})
export class AppModule {}
