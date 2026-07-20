import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'rain-api' };
  }
}
