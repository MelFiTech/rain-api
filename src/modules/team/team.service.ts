import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateId } from '../../common/utils/ids';
import type { TeamRole, UserEntity } from '../../domain/types';
import { EmailService } from '../../providers/email/email.service';
import {
  InstitutionRepository,
  TeamRepository,
  UserRepository,
} from '../../persistence';
import { NotificationsService } from '../notifications/notifications.service';
import { InvitesService } from '../invites/invites.service';

export interface TeamMemberDto {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: 'active' | 'invited' | 'deactivated';
  lastActiveAt: string;
}

@Injectable()
export class TeamService {
  constructor(
    private readonly users: UserRepository,
    private readonly team: TeamRepository,
    private readonly institutions: InstitutionRepository,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly invites: InvitesService,
  ) {}

  async listForInstitution(institutionId: string): Promise<TeamMemberDto[]> {
    const members = (await this.users.listByInstitution(institutionId)).map(
      (u) => this.userToMember(u),
    );

    const invited = (await this.team.listInvites(institutionId))
      .filter((m) => m.status === 'invited')
      .map((i) => ({
        id: i.id,
        name: i.name,
        email: i.email,
        role: i.role,
        status: 'invited' as const,
        lastActiveAt: i.invitedAt,
      }));

    return [...members, ...invited];
  }

  async invite(input: {
    institutionId: string;
    name: string;
    email: string;
    role: TeamRole;
  }): Promise<TeamMemberDto> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    const existingUser = await this.users.findByEmail(email);
    if (existingUser) {
      if (existingUser.institutionId === input.institutionId) {
        throw new BadRequestException(
          'This person already has an account on your institution.',
        );
      }
      throw new BadRequestException(
        'This email is already registered on Rain.',
      );
    }

    const pendingInvite = await this.team.findInviteByEmail(
      input.institutionId,
      email,
    );
    if (pendingInvite) {
      throw new BadRequestException(
        'An invitation for this email is already pending.',
      );
    }

    const tokenFields = this.invites.buildTeamInviteTokenFields();
    const invite = {
      id: generateId('tm'),
      institutionId: input.institutionId,
      name,
      email,
      role: input.role,
      status: 'invited' as const,
      invitedAt: new Date().toISOString(),
      tokenHash: tokenFields.hash,
      expiresAt: tokenFields.expiresAt,
    };
    await this.team.saveInvite(invite);

    const link = this.invites.inviteLink(tokenFields.plain);
    const institution = await this.institutions.findById(input.institutionId);

    await this.notifications.add(
      input.institutionId,
      'Team invite sent',
      `Invitation sent to ${invite.email} as ${invite.role}.`,
    );

    await this.email.send(
      invite.email,
      'Rain: team invitation',
      `Hi ${invite.name},\n\nYou have been invited to join ${institution?.name ?? 'your institution'} on Rain as ${invite.role}.\n\nAccept your invitation and set your password:\n${link}\n\nThis link expires in 7 days.\n\nRain`,
    );

    return {
      id: invite.id,
      name: invite.name,
      email: invite.email,
      role: invite.role,
      status: 'invited',
      lastActiveAt: invite.invitedAt,
    };
  }

  async updateMember(
    institutionId: string,
    id: string,
    patch: { role?: TeamRole; status?: TeamMemberDto['status'] },
  ): Promise<TeamMemberDto | null> {
    const user = await this.users.findById(id);
    if (user && user.institutionId === institutionId) {
      if (patch.role) user.role = patch.role;
      if (patch.status === 'deactivated') {
        return null;
      }
      await this.users.save(user);
      return this.userToMember(user);
    }
    const invited = await this.team.findInvite(id);
    if (!invited || invited.institutionId !== institutionId) return null;
    if (patch.role) invited.role = patch.role;
    if (patch.status && patch.status !== 'active') {
      invited.status = patch.status;
    }
    await this.team.saveInvite(invited);
    return {
      id: invited.id,
      name: invited.name,
      email: invited.email,
      role: invited.role,
      status: invited.status === 'deactivated' ? 'deactivated' : 'invited',
      lastActiveAt: invited.invitedAt,
    };
  }

  private userToMember(user: UserEntity): TeamMemberDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'active',
      lastActiveAt: new Date().toISOString(),
    };
  }
}
