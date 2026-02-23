import { test, expect } from '@playwright/test';

/* ════════════════════════════════════════════════════════
   Agent-Ecosystem E2E Tests – Skills Management
   ════════════════════════════════════════════════════════ */

test.describe('Skills page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/skills');
  });

  test('loads skills page with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Skill Management' })).toBeVisible();
  });

  test('shows empty state when no skills added', async ({ page }) => {
    await expect(page.getByText('No skill sources added yet')).toBeVisible();
  });

  test('shows skills index summary cards', async ({ page }) => {
    // The index should load (even if 0 total)
    await expect(page.getByText('Total Skills')).toBeVisible();
    await expect(page.getByText('Categories')).toBeVisible();
    await expect(page.getByText('Sources', { exact: true })).toBeVisible();
  });

  test('has add skill input and button', async ({ page }) => {
    await expect(page.getByPlaceholder(/github\.com/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /add/i })).toBeVisible();
  });

  test('refuses to add empty URL', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add/i });
    // Button should be disabled when input is empty
    await expect(addBtn).toBeDisabled();
  });

  test('shows Update All button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /update all/i })).toBeVisible();
  });
});
