import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { lastValueFrom } from 'rxjs';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/auth.decorators';
import type { InstitutionEntity, UserEntity } from '../../domain/types';
import { InstitutionRepository } from '../../persistence';

@Injectable()
export class PlatformAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly institutions: InstitutionRepository,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (!request.path.startsWith('/platform')) {
      return true;
    }

    const result = await super.canActivate(context);
    const ok =
      typeof result === 'boolean' ? result : await lastValueFrom(result);
    if (!ok) return false;

    const user = (request as Request & { user?: UserEntity }).user;
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session.');
    }

    const institution = await this.institutions.findById(user.institutionId);
    if (!institution) {
      throw new UnauthorizedException('Invalid or expired session.');
    }

    (request as Request & { institution: InstitutionEntity }).institution =
      institution;
    return true;
  }

  handleRequest<TUser = UserEntity>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.path.startsWith('/platform')) {
      return user as TUser;
    }

    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or expired session.');
    }

    (request as Request & { user: UserEntity }).user = user as unknown as UserEntity;
    return user;
  }
}
