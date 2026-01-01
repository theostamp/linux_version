import type { Building } from '@/lib/api';
import type { User } from '@/types/user';

export type NormalizedRole =
  | 'resident'
  | 'internal_manager'
  | 'office_staff'
  | 'manager'
  | 'staff'
  | 'superuser';

export type RoleDescriptor = Pick<User, 'id' | 'email' | 'role' | 'profile' | 'is_superuser' | 'is_staff'>;
export type RoleAwareUser = RoleDescriptor | null | undefined;

const ROLE_ALIASES: Record<string, NormalizedRole> = {
  resident: 'resident',
  tenant: 'resident',
  owner: 'resident',
  internal_manager: 'internal_manager',
  office_manager: 'manager',
  manager: 'manager',
  // Platform admin (backend role=admin) should map to Ultra Admin behavior
  admin: 'superuser',
  office_staff: 'office_staff',
  staff: 'staff',
  superuser: 'superuser',
};

const OFFICE_ADMIN_ROLES: NormalizedRole[] = ['manager', 'office_staff', 'staff', 'superuser'];
const INTERNAL_OR_ADMIN_ROLES: NormalizedRole[] = ['internal_manager', ...OFFICE_ADMIN_ROLES];

function normalizeRole(role?: string | null): NormalizedRole | undefined {
  if (!role) return undefined;
  return ROLE_ALIASES[role.toLowerCase()] ?? undefined;
}

export function getEffectiveRole(user: RoleAwareUser): NormalizedRole | undefined {
  // First check declared role - this should take priority
  const declaredRole =
    normalizeRole(user?.role) ??
    normalizeRole(user?.profile?.role);

  // If user has an explicit declared role, use it (even if they also have is_staff/is_superuser)
  if (declaredRole) {
    return declaredRole;
  }

  // Only fall back to is_superuser/is_staff if no declared role exists
  if (user?.is_superuser) return 'superuser';
  if (user?.is_staff) return 'staff';

  return undefined;
}

const matchesInternalManager = (user: RoleAwareUser, building?: Building | null): boolean => {
  if (!user || !building) return false;

  if (typeof building.internal_manager_id === 'number' && typeof user.id === 'number') {
    return building.internal_manager_id === user.id;
  }
  if (building.internal_manager?.id && typeof user.id === 'number') {
    return building.internal_manager.id === user.id;
  }
  if (building.internal_manager?.email && user.email) {
    return building.internal_manager.email.toLowerCase() === user.email.toLowerCase();
  }
  return false;
};

const getRoleFromBuildingPermissions = (building?: Building | null): NormalizedRole | undefined => {
  const perms = building?.permissions;
  if (!perms) return undefined;
  if (perms.is_internal_manager) return 'internal_manager';
  if (perms.is_resident) return 'resident';
  return undefined;
};

export function getEffectiveRoleForBuilding(
  user: RoleAwareUser,
  building?: Building | null,
): NormalizedRole | undefined {
  const baseRole = getEffectiveRole(user);
  if (!building) return baseRole;

  if (baseRole && OFFICE_ADMIN_ROLES.includes(baseRole)) {
    return baseRole;
  }

  const permissionRole = getRoleFromBuildingPermissions(building);
  if (permissionRole) {
    return permissionRole;
  }

  if (matchesInternalManager(user, building)) {
    return 'internal_manager';
  }

  if (baseRole === 'internal_manager') {
    if (building.internal_manager_id || building.internal_manager) {
      return 'resident';
    }
    return baseRole;
  }

  return baseRole;
}

export function userHasRole(user: RoleAwareUser, allowedRoles: NormalizedRole[]): boolean {
  const role = getEffectiveRole(user);
  if (!role) return false;
  return allowedRoles.includes(role);
}

export function hasOfficeAdminAccess(user: RoleAwareUser): boolean {
  return userHasRole(user, OFFICE_ADMIN_ROLES);
}

export function hasInternalManagerAccess(user: RoleAwareUser, building?: Building | null): boolean {
  const role = building ? getEffectiveRoleForBuilding(user, building) : getEffectiveRole(user);
  if (!role) return false;
  return INTERNAL_OR_ADMIN_ROLES.includes(role);
}

export function isResident(user: RoleAwareUser): boolean {
  return getEffectiveRole(user) === 'resident';
}

export function getRoleLabelFromRole(role?: NormalizedRole): string {
  switch (role) {
    case 'resident':
      return 'Ένοικος';
    case 'internal_manager':
      return 'Εσωτερικός Διαχειριστής';
    case 'office_staff':
      return 'Υπάλληλος Γραφείου';
    case 'manager':
      return 'Διαχειριστής';
    case 'staff':
      return 'Διαχειριστής';
    case 'superuser':
      return 'Ultra Admin';
    default:
      return 'Χρήστης';
  }
}

export function getRoleLabel(user: RoleAwareUser): string {
  return getRoleLabelFromRole(getEffectiveRole(user));
}

export function getDefaultLandingPath(user: RoleAwareUser): string {
  const role = getEffectiveRole(user);

  switch (role) {
    case 'resident':
      return '/my-apartment';
    case 'internal_manager':
      return '/financial';
    case 'office_staff':
    case 'manager':
    case 'staff':
    case 'superuser':
      return '/dashboard';
    default:
      return '/announcements';
  }
}
