import { test, expect } from '@playwright/test';
import { getRoleCredentials, missingCredentialMessage } from './utils/credentials';
import { performLogin, ensureTextAbsent } from './utils/login';

test.describe('Έλεγχος πρόσβασης ανά ρόλο', () => {
  test('Resident → /my-apartment χωρίς admin modules', async ({ page }) => {
    const creds = getRoleCredentials('resident');
    test.skip(!creds, missingCredentialMessage('resident'));
    if (!creds) return;

    await performLogin(page, creds);

    await expect(page.getByRole('heading', { name: 'Το Διαμέρισμά μου' })).toBeVisible();
    await ensureTextAbsent(page.getByText('Κατάσταση Κτιρίων'));
    await ensureTextAbsent(page.getByText('Γραφείο Διαχείρισης'));
  });

  test('Internal manager → /financial χωρίς πρόσβαση σε Κατάσταση Κτιρίων', async ({ page }) => {
    const creds = getRoleCredentials('internalManager');
    test.skip(!creds, missingCredentialMessage('internalManager'));
    if (!creds) return;

    await performLogin(page, creds);

    await expect(page).toHaveURL(/\/financial/);
    await ensureTextAbsent(page.getByText('Κατάσταση Κτιρίων'));
  });

  test('Office manager/staff → Dashboard με Κατάσταση Κτιρίων διαθέσιμη', async ({ page }) => {
    const creds = getRoleCredentials('officeManager');
    test.skip(!creds, missingCredentialMessage('officeManager'));
    if (!creds) return;

    await performLogin(page, creds);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Κατάσταση Κτιρίων').first()).toBeVisible();
    await expect(page.getByText('Γραφείο Διαχείρισης').first()).toBeVisible();
  });

  test('Superuser → Dashboard με label Ultra Admin', async ({ page }) => {
    const creds = getRoleCredentials('superuser');
    test.skip(!creds, missingCredentialMessage('superuser'));
    if (!creds) return;

    await performLogin(page, creds);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Ultra Admin').first()).toBeVisible();
  });
});

