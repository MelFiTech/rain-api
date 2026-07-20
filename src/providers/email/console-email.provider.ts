import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailProvider } from './interfaces/email-provider.interface';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `Email → ${message.to} | ${message.subject}\n${message.text}`,
    );
  }
}
