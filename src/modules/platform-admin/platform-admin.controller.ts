import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';

@Controller('platform/admin')
@UseGuards(PlatformAdminGuard)
export class PlatformAdminController {
  constructor(private readonly admin: PlatformAdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.admin.getDashboard();
  }

  @Get('institutions')
  listInstitutions() {
    return this.admin.listInstitutions();
  }

  @Get('institutions/:id')
  getInstitution(@Param('id') id: string) {
    return this.admin.getInstitution(id);
  }

  @Get('institutions/:id/activity')
  getInstitutionActivity(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.admin.getInstitutionActivity(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('transactions')
  listTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.admin.listTransactions(
      page ? Number(page) : 1,
      limit ? Number(limit) : 25,
      type,
    );
  }

  @Get('transactions/:id')
  getTransaction(@Param('id') id: string) {
    return this.admin.getTransaction(id);
  }

  @Get('webhook-logs')
  listWebhookLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.admin.listWebhookLogs(
      page ? Number(page) : 1,
      limit ? Number(limit) : 25,
    );
  }

  @Get('webhook-logs/:id')
  getWebhookLog(@Param('id') id: string) {
    return this.admin.getWebhookLog(id);
  }
}
