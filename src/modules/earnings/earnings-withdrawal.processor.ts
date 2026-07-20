import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { EarningsService } from './earnings.service';

@Injectable()
export class EarningsWithdrawalProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(EarningsWithdrawalProcessor.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private missingTableLogged = false;

  constructor(
    private readonly earnings: EarningsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const intervalMs =
      this.config.get<number>('earnings.bankWithdrawWorkerIntervalMs') ??
      300_000;
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.earnings.processDueBankWithdrawals();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2021'
      ) {
        if (!this.missingTableLogged) {
          this.missingTableLogged = true;
          this.logger.warn(
            'EarningsWithdrawalRequest table missing — run `npx prisma db push`.',
          );
        }
        return;
      }
      this.logger.error(
        'Bank withdrawal worker failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
