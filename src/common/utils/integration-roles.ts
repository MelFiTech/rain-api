import type { TeamRole } from '../../domain/types';

export const INTEGRATION_MANAGER_ROLES: TeamRole[] = [
  'administrator',
  'developer',
];

export function canManageIntegrationSettings(role: TeamRole): boolean {
  return INTEGRATION_MANAGER_ROLES.includes(role);
}
