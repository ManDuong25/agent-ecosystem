import { test, expect } from '@playwright/test';

/* ════════════════════════════════════════════════════════
   Agent-Ecosystem E2E Tests – API Endpoints
   ════════════════════════════════════════════════════════ */

test.describe('API Health', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.version).toBe('0.2.0');
    expect(json.uptime).toBeGreaterThan(0);
  });
});

test.describe('API Skills', () => {
  test('list skills returns empty array', async ({ request }) => {
    const res = await request.get('/api/skills');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('skills index returns valid structure', async ({ request }) => {
    const res = await request.get('/api/skills/index');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.totalSkills).toBeDefined();
    expect(json.data.entries).toBeDefined();
    expect(json.data.builtAt).toBeTruthy();
  });
});

test.describe('API Specs', () => {
  const repoPath = 'D:\\agent-ecosystem';

  test('list specs for repo', async ({ request }) => {
    const res = await request.get(`/api/specs?repoPath=${encodeURIComponent(repoPath)}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('create and delete spec', async ({ request }) => {
    // Create
    const createRes = await request.post('/api/specs', {
      data: { repoPath, name: 'Test Spec E2E', description: 'E2E test spec' },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    expect(created.ok).toBe(true);
    expect(created.data.name).toBe('Test Spec E2E');
    const specId = created.data.id;

    // Get
    const getRes = await request.get(`/api/specs/${specId}?repoPath=${encodeURIComponent(repoPath)}`);
    expect(getRes.ok()).toBeTruthy();
    const spec = await getRes.json();
    expect(spec.data.id).toBe(specId);

    // Delete
    const delRes = await request.delete(`/api/specs/${specId}?repoPath=${encodeURIComponent(repoPath)}`);
    expect(delRes.ok()).toBeTruthy();
  });
});

test.describe('API Bugs', () => {
  const repoPath = 'D:\\agent-ecosystem';

  test('list bugs', async ({ request }) => {
    const res = await request.get(`/api/specs/bugs/list?repoPath=${encodeURIComponent(repoPath)}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('create bug', async ({ request }) => {
    const res = await request.post('/api/specs/bugs', {
      data: {
        repoPath,
        title: 'E2E Test Bug',
        description: 'Test description',
        stepsToReproduce: '1. Step one\n2. Step two',
        severity: 'medium',
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.title).toBe('E2E Test Bug');
    expect(json.data.status).toBe('open');
  });
});

test.describe('API Engineer', () => {
  test('chrome status returns null when not launched', async ({ request }) => {
    const res = await request.get('/api/engineer/chrome/status');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toBeNull();
  });

  test('chrome config returns valid structure', async ({ request }) => {
    const res = await request.get('/api/engineer/chrome/config');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.executablePath).toBeTruthy();
    expect(json.data.profilePath).toBeTruthy();
  });
});

test.describe('API AI', () => {
  test('ai config returns masked keys', async ({ request }) => {
    const res = await request.get('/api/ai/config');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.proxyApiKey).toBe('***');
    expect(json.data.model).toBeTruthy();
  });
});
