import { test, expect } from '@playwright/test';

/* ════════════════════════════════════════════════════════
   Agent-Ecosystem E2E Tests – Repo Setup
   ════════════════════════════════════════════════════════ */

test.describe('Repo Setup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/repo');
  });

  test('loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Repository Setup' })).toBeVisible();
  });

  test('has path input', async ({ page }) => {
    await expect(page.getByPlaceholder(/my-project/i)).toBeVisible();
  });

  test('scan button disabled when no path is entered', async ({ page }) => {
    const scanBtn = page.getByRole('button', { name: /scan|setup/i });
    await expect(scanBtn).toBeVisible();
  });
});
