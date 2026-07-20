import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { AppConfigService } from './app-config.service';

@Controller('public')
export class PublicConfigController {
  constructor(private readonly config: AppConfigService) {}

  @Public()
  @Get('pricing')
  async pricing() {
    return this.config.getPricing();
  }
}
