import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/auth.decorators';
import { PASSWORD_POLICY_MESSAGE } from '../../common/validation/password-policy';
import { AccessRequestsService } from './access-requests.service';

class SubmitAccessRequestDto {
  @IsString()
  @MinLength(1)
  companyName!: string;

  @IsString()
  @MinLength(1)
  cacNumber!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password!: string;
}

@Controller('public/access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequests: AccessRequestsService) {}

  @Public()
  @Post()
  submit(@Body() body: SubmitAccessRequestDto) {
    return this.accessRequests.submit(body);
  }
}
