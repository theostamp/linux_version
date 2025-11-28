import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import type { RoleCredentials } from './credentials';

export async function performLogin(page: Page, creds: RoleCredentials) {
  await page.goto('/login', { waitUntil: 'networkidle' });

  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Κωδικός');
  const submitButton = page.getByRole('button', { name: /Σύνδεση/i });

  await emailInput.fill(creds.email);
  await passwordInput.fill(creds.password);

  await Promise.all([
    page.waitForURL(`**${creds.expectedPath}**`, { timeout: 60_000 }),
    submitButton.click(),
  ]);

  // Βεβαιώσου ότι η σελίδα ολοκλήρωσε τα βασικά requests
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(new RegExp(`${creds.expectedPath.replace(/\//g, '\\/')}.*`));
}

export async function ensureTextAbsent(locator: Locator) {
  await expect(locator).toHaveCount(0);
}

