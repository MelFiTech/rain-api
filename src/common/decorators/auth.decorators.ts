import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { InstitutionEntity, UserEntity } from '../../domain/types';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentInstitution = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): InstitutionEntity => {
    const request = ctx.switchToHttp().getRequest<{ institution: InstitutionEntity }>();
    return request.institution;
  },
);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest<{ user: UserEntity }>();
    return request.user;
  },
);
