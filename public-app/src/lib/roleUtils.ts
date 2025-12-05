import type { User } from '@/types/user';

export type NormalizedRole =
  | 'resident'
  | 'internal_manager'
  | 'office_staff'
  | 'manager'
  | 'staff'
  | 'superuser';

export type RoleDescriptor = Pick<User, 'role' | 'profile' | 'is_superuser' | 'is_staff'>;
export type RoleAwareUser = RoleDescriptor | null | undefined;

const ROLE_ALIASES: Record<string, NormalizedRole> = {
  resident: 'resident',
  tenant: 'resident',
  owner: 'resident',
  internal_manager: 'internal_manager',
  office_manager: 'manager',
  manager: 'manager',
  admin: 'manager',
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

  // Debug logging
  console.log('[roleUtils] getEffectiveRole:', {
    rawRole: user?.role,
    profileRole: user?.profile?.role,
    normalizedRole: declaredRole,
    is_superuser: user?.is_superuser,
    is_staff: user?.is_staff,
  });

  // If user has an explicit declared role, use it (even if they also have is_staff/is_superuser)
  if (declaredRole) {
    return declaredRole;
  }

  // Only fall back to is_superuser/is_staff if no declared role exists
  if (user?.is_superuser) return 'superuser';
  if (user?.is_staff) return 'staff';

  return undefined;
}

export function userHasRole(user: RoleAwareUser, allowedRoles: NormalizedRole[]): boolean {
  const role = getEffectiveRole(user);
  if (!role) return false;
  return allowedRoles.includes(role);
}

export function hasOfficeAdminAccess(user: RoleAwareUser): boolean {
  return userHasRole(user, OFFICE_ADMIN_ROLES);
}

export function hasInternalManagerAccess(user: RoleAwareUser): boolean {
  return userHasRole(user, INTERNAL_OR_ADMIN_ROLES);
}

export function isResident(user: RoleAwareUser): boolean {
  return getEffectiveRole(user) === 'resident';
}

export function getRoleLabel(user: RoleAwareUser): string {
  const role = getEffectiveRole(user);

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

