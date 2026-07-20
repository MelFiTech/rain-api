import { Module } from '@nestjs/common';
import { ProvidersModule } from '../../providers/providers.module';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [ProvidersModule],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
