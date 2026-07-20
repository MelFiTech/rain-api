import { Injectable } from '@nestjs/common';
import { IdempotencyRepository } from '../../persistence';

@Injectable()
export class IdempotencyService {
  constructor(private readonly idempotency: IdempotencyRepository) {}

  async get(
    institutionId: string,
    key: string,
    resourceType: 'verification' | 'report',
  ): Promise<string | null> {
    return this.idempotency.getResourceId(institutionId, key, resourceType);
  }

  async set(
    institutionId: string,
    key: string,
    resourceType: 'verification' | 'report',
    resourceId: string,
  ) {
    await this.idempotency.set(institutionId, key, resourceType, resourceId);
  }
}
