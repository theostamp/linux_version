export type RoleKey = 'resident' | 'internalManager' | 'officeManager' | 'superuser';

export interface RoleCredentials {
  role: RoleKey;
  email: string;
  password: string;
  expectedPath: string;
  description: string;
}

const ROLE_ENV_CONFIG: Record<
  RoleKey,
  { email: string; password: string; expectedPath: string; description: string }
> = {
  resident: {
    email: 'PLAYWRIGHT_RESIDENT_EMAIL',
    password: 'PLAYWRIGHT_RESIDENT_PASSWORD',
    expectedPath: '/my-apartment',
    description: 'Ένοικος (Resident)',
  },
  internalManager: {
    email: 'PLAYWRIGHT_INTERNAL_MANAGER_EMAIL',
    password: 'PLAYWRIGHT_INTERNAL_MANAGER_PASSWORD',
    expectedPath: '/financial',
    description: 'Εσωτερικός Διαχειριστής (Internal Manager)',
  },
  officeManager: {
    email: 'PLAYWRIGHT_OFFICE_MANAGER_EMAIL',
    password: 'PLAYWRIGHT_OFFICE_MANAGER_PASSWORD',
    expectedPath: '/dashboard',
    description: 'Γραφείο Διαχείρισης (Office Manager / Staff)',
  },
  superuser: {
    email: 'PLAYWRIGHT_SUPERUSER_EMAIL',
    password: 'PLAYWRIGHT_SUPERUSER_PASSWORD',
    expectedPath: '/dashboard',
    description: 'Ultra Admin (Superuser)',
  },
};

export function getRoleCredentials(role: RoleKey): RoleCredentials | null {
  const config = ROLE_ENV_CONFIG[role];
  const email = process.env[config.email];
  const password = process.env[config.password];

  if (!email || !password) {
    return null;
  }

  return {
    role,
    email,
    password,
    expectedPath: config.expectedPath,
    description: config.description,
  };
}

export function missingCredentialMessage(role: RoleKey): string {
  const config = ROLE_ENV_CONFIG[role];
  return `Ορίστε τα env vars ${config.email} και ${config.password} για να εκτελεστεί το σενάριο για ${config.description}.`;
}

