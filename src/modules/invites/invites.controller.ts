import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { InvitesService } from './invites.service';

@Controller('public/invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Public()
  @Get('preview')
  preview(@Query('token') token?: string) {
    if (!token?.trim()) {
      return { error: 'Token is required.' };
    }
    return this.invites.preview(token.trim());
  }

  @Public()
  @Post('accept')
  accept(
    @Body()
    body: {
      token: string;
      password: string;
      confirmPassword: string;
    },
  ) {
    return this.invites.accept(body);
  }
}
