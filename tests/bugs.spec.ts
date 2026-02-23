import { test, expect } from '@playwright/test';

/* ════════════════════════════════════════════════════════
   Agent-Ecosystem E2E Tests – Bug Tracker
   ════════════════════════════════════════════════════════ */

test.describe('Bugs page', () => {
  test.beforeEach(async ({ page }) => {
    // Set repo path so the full Bugs page renders (otherwise it shows 'set up repo' message)
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('ae:repoPath', 'D:\\agent-ecosystem'));
    await page.goto('/bugs');
  });

  test('loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bug Tracker' })).toBeVisible();
  });

  test('shows repo-needed message when no repo configured', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('ae:repoPath'));
    await page.goto('/bugs');
    await expect(page.getByText(/set up a repository/i)).toBeVisible();
  });
});

test.describe('Bugs with repo configured', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('ae:repoPath', 'D:\\agent-ecosystem');
    });
    await page.goto('/bugs');
  });

  test('shows stats cards', async ({ page }) => {
    await expect(page.getByText('Open')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Resolved')).toBeVisible();
  });

  test('has Report Bug button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /report bug/i })).toBeVisible();
  });

  test('shows bug form when clicking Report Bug', async ({ page }) => {
    await page.getByRole('button', { name: /report bug/i }).click();
    await expect(page.getByText('New Bug Report')).toBeVisible();
    await expect(page.getByPlaceholder(/brief description/i)).toBeVisible();
  });

  test('bug form has severity selector', async ({ page }) => {
    await page.getByRole('button', { name: /report bug/i }).click();
    await expect(page.getByRole('button', { name: /low/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /medium/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /high/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /critical/i })).toBeVisible();
  });
});
