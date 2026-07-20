import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccessRequestRepository } from './repositories/access-request.repository';
import { EarningsRepository } from './repositories/earnings.repository';
import { IdempotencyRepository } from './repositories/idempotency.repository';
import { InstitutionRepository } from './repositories/institution.repository';
import { LoginSessionRepository } from './repositories/login-session.repository';
import { NotificationRepository } from './repositories/notification.repository';
import { OtpRepository } from './repositories/otp.repository';
import { PlatformCustomerRepository } from './repositories/platform-customer.repository';
import { ReportRepository } from './repositories/report.repository';
import { TeamRepository } from './repositories/team.repository';
import { UserRepository } from './repositories/user.repository';
import { VerificationRepository } from './repositories/verification.repository';
import { WalletRepository } from './repositories/wallet.repository';
import { WebhookRepository } from './repositories/webhook.repository';

const repositories = [
  AccessRequestRepository,
  EarningsRepository,
  IdempotencyRepository,
  InstitutionRepository,
  LoginSessionRepository,
  NotificationRepository,
  OtpRepository,
  PlatformCustomerRepository,
  ReportRepository,
  TeamRepository,
  UserRepository,
  VerificationRepository,
  WalletRepository,
  WebhookRepository,
];

@Global()
@Module({
  imports: [PrismaModule],
  providers: repositories,
  exports: repositories,
})
export class PersistenceModule {}
