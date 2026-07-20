import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { assertPasswordPolicy } from '../../common/validation/password-policy';
import {
  generateInviteToken,
  hashInviteToken,
  INVITE_TTL_MS,
} from '../../common/utils/invite-token';
import type { AccessRequestEntity, TeamInviteEntity } from '../../domain/types';
import { EmailService } from '../../providers/email/email.service';
import {
  AccessRequestRepository,
  InstitutionRepository,
  TeamRepository,
  UserRepository,
} from '../../persistence';
import { InstitutionProvisioningService } from '../onboarding/institution-provisioning.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class InvitesService {
  constructor(
    private readonly accessRequests: AccessRequestRepository,
    private readonly team: TeamRepository,
    private readonly users: UserRepository,
    private readonly institutions: InstitutionRepository,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly provisioning: InstitutionProvisioningService,
    private readonly auth: AuthService,
  ) {}

  inviteLink(token: string): string {
    const base = (
      this.config.get<string>('platform.webAppUrl') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${base}/accept-invite?token=${encodeURIComponent(token)}`;
  }

  async preview(token: string) {
    const hash = hashInviteToken(token);
    const teamInvite = await this.team.findInviteByTokenHash(hash);
    if (teamInvite && teamInvite.status === 'invited') {
      if (new Date(teamInvite.expiresAt) < new Date()) {
        throw new BadRequestException('This invitation has expired.');
      }
      const institution = await this.institutions.findById(teamInvite.institutionId);
      return {
        kind: 'team' as const,
        name: teamInvite.name,
        email: teamInvite.email,
        role: teamInvite.role,
        institutionName: institution?.name ?? 'Your institution',
      };
    }

    const accessRequest = await this.accessRequests.findByOnboardingTokenHash(
      hash,
    );
    if (accessRequest && accessRequest.status === 'approved') {
      if (
        accessRequest.onboardingExpiresAt &&
        new Date(accessRequest.onboardingExpiresAt) < new Date()
      ) {
        throw new BadRequestException('This setup link has expired.');
      }
      return {
        kind: 'onboarding' as const,
        name: accessRequest.companyName,
        email: accessRequest.email,
        role: 'administrator' as const,
        institutionName: accessRequest.companyName,
      };
    }

    throw new NotFoundException('Invitation not found or no longer valid.');
  }

  async accept(input: {
    token: string;
    password: string;
    confirmPassword: string;
  }) {
    if (input.password !== input.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }
    assertPasswordPolicy(input.password);

    const hash = hashInviteToken(input.token);
    const teamInvite = await this.team.findInviteByTokenHash(hash);
    if (teamInvite && teamInvite.status === 'invited') {
      return this.acceptTeamInvite(teamInvite, input.password);
    }

    const accessRequest = await this.accessRequests.findByOnboardingTokenHash(
      hash,
    );
    if (accessRequest && accessRequest.status === 'approved') {
      return this.acceptOnboarding(accessRequest, input.password);
    }

    throw new NotFoundException('Invitation not found or no longer valid.');
  }

  private async acceptTeamInvite(
    invite: TeamInviteEntity,
    password: string,
  ) {
    if (new Date(invite.expiresAt) < new Date()) {
      throw new BadRequestException('This invitation has expired.');
    }

    const existing = await this.users.findByEmail(invite.email);
    if (existing) {
      if (existing.institutionId !== invite.institutionId) {
        throw new BadRequestException(
          'This email is already registered on another institution.',
        );
      }
      throw new BadRequestException(
        'An account with this email already exists. Sign in instead.',
      );
    }

    const user = await this.provisioning.createUser({
      institutionId: invite.institutionId,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      password,
    });

    invite.status = 'deactivated';
    invite.tokenHash = undefined;
    await this.team.saveInvite(invite);

    const login = await this.auth.login(invite.email, password);
    if (!login.success) {
      return {
        success: true as const,
        message: 'Account created. You can sign in now.',
      };
    }
    return { success: true as const, session: login.session };
  }

  private async acceptOnboarding(
    request: AccessRequestEntity,
    password: string,
  ) {
    if (
      request.onboardingExpiresAt &&
      new Date(request.onboardingExpiresAt) < new Date()
    ) {
      throw new BadRequestException('This setup link has expired.');
    }

    if (!request.institutionId) {
      throw new BadRequestException('Institution provisioning incomplete.');
    }

    const existing = await this.users.findByEmail(request.email);
    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists. Sign in instead.',
      );
    }

    const name = request.companyName;
    await this.provisioning.createUser({
      institutionId: request.institutionId,
      email: request.email,
      name,
      role: 'administrator',
      password,
    });

    request.onboardingTokenHash = undefined;
    request.onboardingExpiresAt = undefined;
    await this.accessRequests.save(request);

    const login = await this.auth.login(request.email, password);
    if (!login.success) {
      return {
        success: true as const,
        message: 'Account ready. You can sign in now.',
      };
    }
    return { success: true as const, session: login.session };
  }

  /** Called when sending team invite email. */
  buildTeamInviteTokenFields(): {
    plain: string;
    hash: string;
    expiresAt: string;
  } {
    const { plain, hash } = generateInviteToken();
    return {
      plain,
      hash,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    };
  }
}
