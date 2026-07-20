import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConsoleEmailProvider } from './console-email.provider';
import { EmailService } from './email.service';
import { EMAIL_PROVIDER } from './interfaces/email-provider.interface';
import { ResendEmailProvider } from './resend-email.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    ConsoleEmailProvider,
    ResendEmailProvider,
    EmailService,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (
        config: ConfigService,
        console: ConsoleEmailProvider,
        resend: ResendEmailProvider,
      ) => {
        const selected = config.get<string>('email.provider', 'console');
        if (selected === 'resend') return resend;
        return console;
      },
      inject: [ConfigService, ConsoleEmailProvider, ResendEmailProvider],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
