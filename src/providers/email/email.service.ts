import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EMAIL_PROVIDER,
  type EmailProvider,
} from './interfaces/email-provider.interface';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    private readonly config: ConfigService,
  ) {}

  async send(to: string, subject: string, text: string, html?: string) {
    await this.provider.send({ to, subject, text, html });
  }

  async sendToOps(subject: string, text: string) {
    const ops = this.config.get<string>('email.opsAddress');
    if (!ops?.trim()) return;
    await this.send(ops.trim(), subject, text);
  }
}
