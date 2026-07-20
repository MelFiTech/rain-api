import type { IdentifierType } from '../../domain/types';
import { normalizeIdentifier } from '../validation/identifier';

export function buildSignalKey(
  identifierType: IdentifierType | string,
  identifier: string,
): string {
  const type = identifierType as IdentifierType;
  const normalized = normalizeIdentifier(type, identifier);
  if (type === 'email') {
    return `email:${normalized}`;
  }
  return `${type}:${normalized}`;
}
