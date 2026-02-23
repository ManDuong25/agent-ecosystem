import { test, expect } from '@playwright/test';

/* ════════════════════════════════════════════════════════
   Agent-Ecosystem E2E Tests – Dashboard + Navigation
   ════════════════════════════════════════════════════════ */

test.describe('Dashboard', () => {
  test('loads and shows heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('shows quick stats cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Repository', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Skills', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Specifications', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('AI Proxy', { exact: true })).toBeVisible();
  });

  test('shows get-started banner when no repo configured', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Get Started')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Setup Repo' })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('sidebar links navigate correctly', async ({ page }) => {
    await page.goto('/');
    // Set repo path so pages that require it show their full UI
    await page.evaluate(() => localStorage.setItem('ae:repoPath', 'D:\\agent-ecosystem'));
    await page.goto('/');
    // Navigate to Skills
    await page.getByRole('link', { name: 'Skills', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Skill Management' })).toBeVisible();

    // Navigate to Specs
    await page.getByRole('link', { name: 'Specifications', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Specifications' })).toBeVisible();

    // Navigate to AI Engineer
    await page.getByRole('link', { name: 'AI Engineer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'AI Engineer Loop' })).toBeVisible();

    // Navigate to Bugs
    await page.getByRole('link', { name: 'Bug Tracker', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bug Tracker' })).toBeVisible();

    // Back to Dashboard
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
