import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailMessage, EmailProvider } from './interfaces/email-provider.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: EmailMessage): Promise<void> {
    const apiKey = this.config.get<string>('email.resendApiKey');
    const from = this.config.get<string>('email.from');
    if (!apiKey?.trim()) {
      throw new Error('RESEND_API_KEY is not configured.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(`Resend failed (${response.status}): ${body}`);
      throw new Error('Could not send email.');
    }
  }
}
