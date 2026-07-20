import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentInstitution } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity, TeamRole } from '../../domain/types';
import { TeamService } from './team.service';

@Controller('platform/team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get('members')
  list(@CurrentInstitution() institution: InstitutionEntity) {
    return this.team.listForInstitution(institution.id);
  }

  @Post('members/invite')
  invite(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: { name: string; email: string; role: TeamRole },
  ) {
    return this.team.invite({
      institutionId: institution.id,
      name: body.name,
      email: body.email,
      role: body.role,
    });
  }

  @Patch('members/:id')
  update(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('id') id: string,
    @Body() body: { role?: TeamRole; status?: 'active' | 'invited' | 'deactivated' },
  ) {
    return this.team.updateMember(institution.id, id, body);
  }
}
