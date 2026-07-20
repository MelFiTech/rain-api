import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { generateId } from '../../common/utils/ids';
import { assertPasswordPolicy } from '../../common/validation/password-policy';
import type { AccessRequestEntity } from '../../domain/types';
import { EmailService } from '../../providers/email/email.service';
import { AccessRequestRepository } from '../../persistence';

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'gmx.com',
  'mail.com',
  'yandex.com',
]);

@Injectable()
export class AccessRequestsService {
  constructor(
    private readonly accessRequests: AccessRequestRepository,
    private readonly email: EmailService,
  ) {}

  async submit(input: {
    companyName: string;
    cacNumber: string;
    email: string;
    password: string;
  }): Promise<{ success: true; reference: string }> {
    const companyName = input.companyName.trim();
    const cacNumber = input.cacNumber.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password;

    if (!companyName || !cacNumber || !email || !password) {
      throw new BadRequestException('All fields are required.');
    }

    assertPasswordPolicy(password);

    if (!this.isCompanyEmail(email)) {
      throw new BadRequestException(
        'Use your company email address. Personal domains are not accepted.',
      );
    }

    const pending = await this.accessRequests.findPendingByEmail(email);
    if (pending) {
      throw new BadRequestException(
        'An access request for this email is already pending review.',
      );
    }

    const entity: AccessRequestEntity = {
      id: generateId('acc'),
      companyName,
      email,
      cacNumber,
      passwordHash: await bcrypt.hash(password, 10),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await this.accessRequests.save(entity);

    await this.email.send(
      email,
      'Rain: access request received',
      `Hi,\n\nWe received your access request for ${companyName}. Our team will verify your institution and email you at ${email} when your account is approved.\n\nUse the password you chose when signing in after approval.\n\nRain`,
    );

    await this.email.sendToOps(
      `New Rain access request: ${companyName}`,
      `${companyName}\nEmail: ${email}\nCAC: ${cacNumber}\nReference: ${entity.id}`,
    );

    return { success: true, reference: entity.id };
  }

  private isCompanyEmail(value: string): boolean {
    const domain = value.split('@')[1];
    return !!domain && domain.includes('.') && !FREE_EMAIL_DOMAINS.has(domain);
  }
}
