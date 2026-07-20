import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { IdentifierType } from '../../domain/types';

export const IDENTIFIER_TYPES = [
  'account_number',
  'phone',
  'email',
  'bvn',
  'nin',
] as const satisfies readonly IdentifierType[];

export function normalizeIdentifier(
  identifierType: IdentifierType,
  identifier: string,
): string {
  const trimmed = identifier.trim();
  switch (identifierType) {
    case 'email':
      return trimmed.toLowerCase();
    case 'phone':
    case 'bvn':
    case 'nin':
    case 'account_number':
      return trimmed.replace(/\D/g, '');
    default:
      return trimmed;
  }
}

export class PlatformVerifyBodyDto {
  @IsIn(IDENTIFIER_TYPES)
  identifierType!: IdentifierType;

  @IsString()
  @MinLength(1)
  identifier!: string;

  /** Bank name or NIP code when identifierType is account_number */
  @IsOptional()
  @IsString()
  bankCode?: string;
}
