export function buildSignalKey(
  identifierType: string,
  identifier: string,
): string {
  const normalized = identifier.replace(/\D/g, '').toLowerCase();
  return `${identifierType}:${normalized}`;
}
