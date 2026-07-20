import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/auth.decorators';
import { MonnifyWebhookService } from './monnify-webhook.service';
import type { MonnifyWebhookPayload } from './monnify-webhook.service';

/** Monnify server-to-server notifications (configure in Monnify dashboard). */
@Controller('webhooks/monnify')
export class MonnifyWebhookController {
  private readonly logger = new Logger(MonnifyWebhookController.name);

  constructor(private readonly webhooks: MonnifyWebhookService) {}

  @Public()
  @Post()
  @HttpCode(200)
  handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('monnify-signature') signature?: string,
  ) {
    try {
      this.webhooks.assertAllowedSourceIp(this.resolveClientIp(req));
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : 'Webhook IP rejected',
      );
      throw new UnauthorizedException('Unauthorized webhook source.');
    }

    const rawBody = req.rawBody;
    const parsed = (req.body ?? {}) as Record<string, unknown>;

    if (!this.webhooks.verifySignature(rawBody, signature, parsed)) {
      this.logger.warn('Rejected Monnify webhook with invalid signature');
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    const payload = parsed as MonnifyWebhookPayload;
    setImmediate(() => {
      void this.webhooks.processPayload(payload).catch((error) => {
        this.logger.error(
          'Monnify webhook processing failed',
          error instanceof Error ? error.stack : String(error),
        );
      });
    });

    return { received: true };
  }

  private resolveClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0]?.trim();
    }
    return req.ip;
  }
}
