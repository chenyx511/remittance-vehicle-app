import { describe, expect, it } from 'vitest';
import { getDefaultPermissionsByRole, hasPermission } from './permissions';
import type { User } from '@/types';

describe('permissions', () => {
  it('returns default permissions by role', () => {
    expect(getDefaultPermissionsByRole('STAFF')).toContain('VEHICLE_USE');
    expect(getDefaultPermissionsByRole('SUPERVISOR')).toContain('REMITTANCE_APPROVE');
    expect(getDefaultPermissionsByRole('FINANCE')).toContain('REMITTANCE_PROCESS');
  });

  it('grants admin all permissions', () => {
    const admin: User = {
      id: 'admin',
      username: 'admin',
      email: 'admin@company.com',
      role: 'ADMIN',
    };
    expect(hasPermission(admin, 'USER_MANAGE')).toBe(true);
    expect(hasPermission(admin, 'REMITTANCE_APPROVE')).toBe(true);
  });

  it('uses assigned permissions if provided', () => {
    const user: User = {
      id: '1',
      username: 'u1',
      email: 'u1@company.com',
      role: 'STAFF',
      permissions: ['REMITTANCE_APPROVE'],
    };
    expect(hasPermission(user, 'REMITTANCE_APPROVE')).toBe(true);
    expect(hasPermission(user, 'VEHICLE_USE')).toBe(false);
  });
});
