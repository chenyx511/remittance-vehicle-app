import type { OperationPermission, User, UserRole } from '@/types';

const DEFAULT_BY_ROLE: Record<UserRole, OperationPermission[]> = {
  STAFF: ['VEHICLE_USE'],
  SUPERVISOR: ['REMITTANCE_APPROVE', 'VEHICLE_APPROVE'],
  FINANCE: ['REMITTANCE_PROCESS'],
  ADMIN: ['USER_MANAGE', 'REMITTANCE_APPROVE', 'REMITTANCE_PROCESS', 'VEHICLE_APPROVE', 'VEHICLE_USE'],
};

export function getDefaultPermissionsByRole(role: UserRole): OperationPermission[] {
  return DEFAULT_BY_ROLE[role];
}

export function hasPermission(user: User | null | undefined, permission: OperationPermission): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const assigned = user.permissions && user.permissions.length > 0
    ? user.permissions
    : getDefaultPermissionsByRole(user.role);
  return assigned.includes(permission);
}

export const ALL_PERMISSIONS: OperationPermission[] = [
  'REMITTANCE_APPROVE',
  'REMITTANCE_PROCESS',
  'VEHICLE_APPROVE',
  'VEHICLE_USE',
  'USER_MANAGE',
];
