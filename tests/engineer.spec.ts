import { test, expect } from '@playwright/test';

/* ════════════════════════════════════════════════════════
   Agent-Ecosystem E2E Tests – AI Engineer Loop
   ════════════════════════════════════════════════════════ */

test.describe('AI Engineer page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/engineer');
  });

  test('loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'AI Engineer Loop' })).toBeVisible();
  });

  test('shows Chrome session status as Inactive initially', async ({ page }) => {
    await expect(page.getByText(/inactive/i)).toBeVisible();
  });

  test('shows target selector (Gemini / ChatGPT)', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Gemini' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ChatGPT' })).toBeVisible();
  });

  test('shows Launch Chrome button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /launch chrome/i })).toBeVisible();
  });

  test('has config toggle', async ({ page }) => {
    // Config panel is hidden by default. The settings gear button toggles it.
    // The gear button is btn-ghost btn-sm near the page header.
    const gearBtn = page.locator('.btn-ghost.btn-sm').first();
    await gearBtn.click();
    await expect(page.getByText('Chrome Configuration')).toBeVisible({ timeout: 3000 });
  });

  test('message textarea is present', async ({ page }) => {
    await expect(page.getByPlaceholder(/message/i)).toBeVisible();
  });
});
