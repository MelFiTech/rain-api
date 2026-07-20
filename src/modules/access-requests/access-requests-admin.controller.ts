import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import type { UserEntity } from '../../domain/types';
import { AccessRequestsAdminService } from './access-requests-admin.service';

@Controller('platform/admin/access-requests')
@UseGuards(PlatformAdminGuard)
export class AccessRequestsAdminController {
  constructor(private readonly admin: AccessRequestsAdminService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.admin.list(status);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.admin.approve(id, user);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
    @Body() body: { reason?: string },
  ) {
    return this.admin.reject(id, user, body.reason);
  }
}
