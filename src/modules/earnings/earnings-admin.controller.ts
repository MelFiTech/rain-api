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
import { EarningsService } from './earnings.service';

@Controller('platform/admin/earnings-withdrawals')
@UseGuards(PlatformAdminGuard)
export class EarningsAdminController {
  constructor(private readonly earnings: EarningsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.earnings.listWithdrawalsForAdmin(status);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.earnings.approveWithdrawalRequest(id, user.email);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
    @Body() body: { reason?: string },
  ) {
    return this.earnings.rejectWithdrawalRequest(id, user.email, body.reason);
  }
}
