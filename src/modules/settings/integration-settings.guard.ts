import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { UserEntity } from '../../domain/types';

const INTEGRATION_ROLES = new Set<UserEntity['role']>([
  'administrator',
  'developer',
]);

@Injectable()
export class IntegrationSettingsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: UserEntity }).user;
    if (!user || !INTEGRATION_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Only administrators and developers can manage API keys and webhooks.',
      );
    }
    return true;
  }
}
