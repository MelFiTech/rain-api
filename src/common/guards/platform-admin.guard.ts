import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { UserEntity } from '../../domain/types';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: UserEntity }).user;
    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    if (!user.isPlatformAdmin) {
      throw new ForbiddenException('Platform administrator access required.');
    }

    return true;
  }
}
