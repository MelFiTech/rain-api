import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentInstitution } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity } from '../../domain/types';
import { NotificationsService } from './notifications.service';

@Controller('platform/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentInstitution() institution: InstitutionEntity) {
    return this.notifications.list(institution.id);
  }

  @Patch(':id')
  markRead(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('id') id: string,
  ) {
    this.notifications.markRead(institution.id, id);
    return { success: true };
  }
}
