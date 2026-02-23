import { test, expect } from '@playwright/test';

/* ════════════════════════════════════════════════════════
   Agent-Ecosystem E2E Tests – Specs Page
   ════════════════════════════════════════════════════════ */

test.describe('Specs page', () => {
  test.beforeEach(async ({ page }) => {
    // Set repo path so the full Specs page renders
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('ae:repoPath', 'D:\\agent-ecosystem'));
    await page.goto('/specs');
  });

  test('loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Specifications' })).toBeVisible();
  });

  test('shows empty state or repo-needed message', async ({ page }) => {
    // Clear repo to verify repo-needed message
    await page.evaluate(() => localStorage.removeItem('ae:repoPath'));
    await page.goto('/specs');
    await expect(page.getByText(/set up a repository/i)).toBeVisible();
  });
});

test.describe('Specs with repo configured', () => {
  test.beforeEach(async ({ page }) => {
    // Set repoPath in localStorage before navigating
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('ae:repoPath', 'D:\\agent-ecosystem');
    });
    await page.goto('/specs');
  });

  test('shows create spec form', async ({ page }) => {
    await expect(page.getByPlaceholder(/feature name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create spec/i })).toBeVisible();
  });

  test('create spec button disabled when name is empty', async ({ page }) => {
    const btn = page.getByRole('button', { name: /create spec/i });
    await expect(btn).toBeDisabled();
  });
});
