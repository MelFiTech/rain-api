import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import {
  CurrentInstitution,
  CurrentUser,
} from '../../common/decorators/auth.decorators';
import type { InstitutionEntity, UserEntity } from '../../domain/types';
import { SettingsService } from './settings.service';
import { IntegrationSettingsGuard } from './integration-settings.guard';
import type { WebhookEventType } from '../../domain/types';

class ApiKeyRevealDto {
  @IsString()
  @MinLength(1)
  requestId!: string;

  @IsString()
  @MinLength(1)
  otp!: string;
}

@Controller('platform/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(
    @CurrentInstitution() institution: InstitutionEntity,
    @CurrentUser() user: UserEntity,
  ) {
    return this.settings.getSettings(institution.id, user.id);
  }

  @Patch('profile')
  patchProfile(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: Record<string, string>,
  ) {
    this.settings.updateProfile(institution.id, body);
    return { success: true };
  }

  @Patch('notifications')
  patchNotifications(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: Record<string, boolean>,
  ) {
    this.settings.updateNotifications(institution.id, body as never);
    return { success: true };
  }

  @Get('settlement-bank')
  getSettlementBank(@CurrentInstitution() institution: InstitutionEntity) {
    return this.settings.getSettlementBank(institution.id);
  }

  @Post('settlement-bank')
  setSettlementBank(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body()
    body: { accountName: string; bankName: string; accountNumber: string },
  ) {
    return this.settings.setSettlementBank(institution.id, body);
  }

  @Post('settlement-bank/resolve')
  resolveBank(
    @Body() body: { bankName: string; accountNumber: string },
  ) {
    return this.settings.resolveAccountName(body.bankName, body.accountNumber);
  }

  @Post('settlement-bank/change-otp')
  changeOtp(
    @CurrentInstitution() institution: InstitutionEntity,
    @CurrentUser() user: UserEntity,
  ) {
    return this.settings.createSettlementBankOtp(institution.id, user.id);
  }

  @Post('settlement-bank/confirm')
  confirmBank(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body()
    body: {
      requestId: string;
      otp: string;
      accountName: string;
      bankName: string;
      accountNumber: string;
    },
  ) {
    return this.settings.confirmSettlementBankChange({
      institutionId: institution.id,
      ...body,
    });
  }

  @Post('password')
  async changePassword(
    @CurrentUser() user: UserEntity,
    @Body()
    body: {
      currentPassword: string;
      newPassword: string;
    },
  ) {
    await this.settings.changePassword(
      user,
      body.currentPassword,
      body.newPassword,
    );
    return { success: true };
  }

  @Post('sessions/:id/logout')
  logoutSession(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    this.settings.revokeSession(user.id, id);
    return { success: true };
  }

  @Post('sessions/logout-all')
  logoutAll(@CurrentUser() user: UserEntity) {
    this.settings.revokeAllSessions(user.id);
    return { success: true };
  }

  @Post('developer/api-key/reveal-otp')
  @UseGuards(IntegrationSettingsGuard)
  revealKeyOtp(
    @CurrentInstitution() institution: InstitutionEntity,
    @CurrentUser() user: UserEntity,
  ) {
    return this.settings.createApiKeyRevealOtp(institution.id, user.id);
  }

  @Post('developer/api-key/reveal')
  @UseGuards(IntegrationSettingsGuard)
  revealKey(
    @CurrentInstitution() institution: InstitutionEntity,
    @CurrentUser() user: UserEntity,
    @Body() body: ApiKeyRevealDto,
  ) {
    return this.settings.revealApiKeyWithOtp({
      institutionId: institution.id,
      userId: user.id,
      requestId: body.requestId,
      otp: body.otp,
    });
  }

  @Post('developer/api-key/rotate')
  @UseGuards(IntegrationSettingsGuard)
  rotateKey(@CurrentInstitution() institution: InstitutionEntity) {
    return this.settings.rotateApiKey(institution.id);
  }

  @Post('developer/webhooks')
  @UseGuards(IntegrationSettingsGuard)
  createWebhook(
    @CurrentInstitution() institution: InstitutionEntity,
    @Body() body: { url: string; events: WebhookEventType[] },
  ) {
    return this.settings.upsertWebhook(institution.id, body);
  }

  @Patch('developer/webhooks/:id')
  @UseGuards(IntegrationSettingsGuard)
  patchWebhook(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      url: string;
      events: WebhookEventType[];
      enabled: boolean;
    }>,
  ) {
    return this.settings.patchWebhook(institution.id, id, body);
  }

  @Delete('developer/webhooks/:id')
  @UseGuards(IntegrationSettingsGuard)
  deleteWebhook(
    @CurrentInstitution() institution: InstitutionEntity,
    @Param('id') id: string,
  ) {
    this.settings.removeWebhook(institution.id, id);
    return { success: true };
  }
}
