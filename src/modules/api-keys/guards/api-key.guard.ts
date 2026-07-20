import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { API_KEY_PREFIX } from '../../../common/constants';
import { IS_PUBLIC_KEY } from '../../../common/decorators/auth.decorators';
import type { InstitutionEntity } from '../../../domain/types';
import { InstitutionRepository } from '../../../persistence';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly institutions: InstitutionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;

    if (!path.startsWith('/v1')) {
      return true;
    }

    const auth = request.header('authorization');
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid API key.');
    }

    const token = auth.slice('Bearer '.length).trim();
    if (!token.startsWith(API_KEY_PREFIX)) {
      throw new UnauthorizedException('Missing or invalid API key.');
    }

    const institution = await this.resolveInstitution(token);
    if (!institution) {
      throw new UnauthorizedException('Missing or invalid API key.');
    }

    void this.institutions.touchApiKeyLastUsed(institution.id);

    (request as Request & { institution: InstitutionEntity }).institution =
      institution;
    return true;
  }

  private async resolveInstitution(
    apiKey: string,
  ): Promise<InstitutionEntity | null> {
    const prefix = apiKey.slice(0, 16);
    const candidates = await this.institutions.findByApiKeyPrefix(prefix);
    for (const institution of candidates) {
      const match = await bcrypt.compare(apiKey, institution.apiKeyHash);
      if (match) return institution;
    }

    if (candidates.length === 0) {
      const institutions = await this.institutions.listAll();
      for (const institution of institutions) {
        const match = await bcrypt.compare(apiKey, institution.apiKeyHash);
        if (match) return institution;
      }
    }
    return null;
  }
}
