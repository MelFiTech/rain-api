import { Injectable } from '@nestjs/common';
import { generateId } from '../../common/utils/ids';
import type { IdentifierType, PlatformCustomerEntity } from '../../domain/types';
import { PlatformCustomerRepository } from '../../persistence';

@Injectable()
export class PlatformCustomersService {
  constructor(private readonly platformCustomers: PlatformCustomerRepository) {}

  async registerFromVerification(input: {
    institutionId: string;
    identifierType: IdentifierType;
    maskedIdentifier: string;
    signalKey: string;
    displayName?: string;
  }): Promise<PlatformCustomerEntity> {
    const existing = await this.platformCustomers.findBySignalKey(
      input.institutionId,
      input.signalKey,
    );

    if (existing) {
      return existing;
    }

    const customer: PlatformCustomerEntity = {
      id: generateId('pcu'),
      institutionId: input.institutionId,
      customerId: generateId('cus'),
      displayName: input.displayName?.trim() || 'Customer',
      matchedField: input.identifierType,
      maskedIdentifier: input.maskedIdentifier,
      signalKey: input.signalKey,
      onboardedAt: new Date().toISOString(),
      status: 'active',
    };
    await this.platformCustomers.save(customer);
    return customer;
  }

  async findMatchForNetworkReport(
    institutionId: string,
    signalKey: string,
  ): Promise<PlatformCustomerEntity | null> {
    return this.platformCustomers.findBySignalKey(institutionId, signalKey);
  }
}
