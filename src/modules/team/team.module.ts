import { Module } from '@nestjs/common';
import { EmailModule } from '../../providers/email/email.module';
import { InvitesModule } from '../invites/invites.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [NotificationsModule, EmailModule, InvitesModule],
  controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule {}
