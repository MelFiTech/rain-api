import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AccessRequestEntity, UserEntity } from '../../domain/types';
import { EmailService } from '../../providers/email/email.service';
import {
  AccessRequestRepository,
  UserRepository,
} from '../../persistence';
import { InstitutionProvisioningService } from '../onboarding/institution-provisioning.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccessRequestsAdminService {
  constructor(
    private readonly accessRequests: AccessRequestRepository,
    private readonly users: UserRepository,
    private readonly provisioning: InstitutionProvisioningService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  list(status?: string) {
    return this.accessRequests
      .list(status)
      .then((rows) => rows.map((r) => this.toDto(r)));
  }

  async approve(id: string, admin: UserEntity) {
    const request = await this.accessRequests.findById(id);
    if (!request) throw new NotFoundException('Access request not found.');
    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be approved.');
    }

    const existingUser = await this.users.findByEmail(request.email);
    if (existingUser) {
      throw new BadRequestException(
        'A user with this email already exists on the platform.',
      );
    }

    const { institution, apiKeyPlain } =
      await this.provisioning.createInstitution({
        name: request.companyName,
        email: request.email,
        contactName: request.companyName,
      });

    await this.provisioning.createUserWithPasswordHash({
      institutionId: institution.id,
      email: request.email,
      name: request.companyName,
      role: 'administrator',
      passwordHash: request.passwordHash,
    });

    const now = new Date().toISOString();
    request.status = 'approved';
    request.reviewedAt = now;
    request.reviewedByEmail = admin.email;
    request.institutionId = institution.id;
    request.onboardingTokenHash = undefined;
    request.onboardingExpiresAt = undefined;
    await this.accessRequests.save(request);

    const webAppUrl = (
      this.config.get<string>('platform.webAppUrl') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');

    await this.email.send(
      request.email,
      'Rain: your institution has been approved',
      `Hi,\n\n${request.companyName} has been approved to join Rain.\n\nSign in at ${webAppUrl}/login with ${request.email} and the password you set when you requested access.\n\nYour API key (save it now; you can also rotate it in Settings):\n${apiKeyPlain}\n\nRain`,
    );

    return {
      success: true,
      request: this.toDto(request),
      institutionId: institution.id,
    };
  }

  async reject(id: string, admin: UserEntity, reason?: string) {
    const request = await this.accessRequests.findById(id);
    if (!request) throw new NotFoundException('Access request not found.');
    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be rejected.');
    }

    request.status = 'rejected';
    request.reviewedAt = new Date().toISOString();
    request.reviewedByEmail = admin.email;
    request.rejectionReason = reason?.trim() || 'Did not meet membership criteria.';
    await this.accessRequests.save(request);

    await this.email.send(
      request.email,
      'Rain: access request update',
      `Hi,\n\nThank you for your interest in Rain. We are unable to approve ${request.companyName} at this time.\n\n${request.rejectionReason}\n\nYou may reply to this thread if you have questions.\n\nRain`,
    );

    return { success: true, request: this.toDto(request) };
  }

  private toDto(r: AccessRequestEntity) {
    return {
      id: r.id,
      companyName: r.companyName,
      email: r.email,
      cacNumber: r.cacNumber,
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      reviewedByEmail: r.reviewedByEmail,
      rejectionReason: r.rejectionReason,
      institutionId: r.institutionId,
    };
  }
}
