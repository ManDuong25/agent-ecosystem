/**
 * ChromeBridge – automates Chrome via Puppeteer to send code to
 * gemini.google.com or chatgpt.com and retrieve AI responses.
 *
 * Uses a user-configurable Chrome profile so existing sessions/auth are reused.
 */

import type { Browser, Page } from 'puppeteer';
import type { ChromeSession, ChromeTarget } from '../../shared/types.js';
import { v4 as uuid } from 'uuid';
import path from 'path';
import os from 'os';

let browser: Browser | null = null;
let currentSession: ChromeSession | null = null;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ── Config ───────────────────────────────────────────────────

interface ChromeConfig {
  executablePath: string;
  profilePath: string;
  headless: boolean;
}

const DEFAULT_CHROME_PATHS: Record<string, string> = {
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/google-chrome',
};

let chromeConfig: ChromeConfig = {
  executablePath: DEFAULT_CHROME_PATHS[process.platform] ?? '',
  profilePath: path.join(os.homedir(), '.agent-ecosystem', 'chrome-profile'),
  headless: false,
};

export function setChromeConfig(config: Partial<ChromeConfig>): void {
  chromeConfig = { ...chromeConfig, ...config };
}

export function getChromeConfig(): ChromeConfig {
  return { ...chromeConfig };
}

// ── Session tracking ─────────────────────────────────────────

export function getSession(): ChromeSession | null {
  return currentSession;
}

// ── Launch / Close ───────────────────────────────────────────

export async function launch(): Promise<ChromeSession> {
  if (browser) {
    return currentSession!;
  }

  currentSession = {
    id: uuid(),
    target: 'gemini',
    profilePath: chromeConfig.profilePath,
    status: 'launching',
    active: false,
    lastActivity: new Date().toISOString(),
  };

  try {
    // Dynamic import because puppeteer is optional/heavy
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.default.launch({
      executablePath: chromeConfig.executablePath,
      userDataDir: chromeConfig.profilePath,
      headless: chromeConfig.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
      defaultViewport: null,
    });

    const proc = browser.process();
    currentSession.status = 'ready';
    currentSession.active = true;
    currentSession.pid = proc?.pid;
    currentSession.lastActivity = new Date().toISOString();
    return currentSession;
  } catch (err: any) {
    currentSession.status = 'error';
    throw new Error(`Failed to launch Chrome: ${err.message}`);
  }
}

export async function close(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
  currentSession = null;
}

// ── Send to Gemini ───────────────────────────────────────────

export async function sendToGemini(content: string): Promise<string> {
  if (!browser) await launch();
  if (!browser) throw new Error('Browser not available');

  currentSession!.target = 'gemini';
  currentSession!.status = 'busy';
  currentSession!.lastActivity = new Date().toISOString();

  const page: Page = await browser.newPage();

  try {
    await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Find the input area (Gemini uses a rich text editor)
    const inputSelector = '[contenteditable="true"], textarea[aria-label*="Enter"], .ql-editor, [role="textbox"]';
    await page.waitForSelector(inputSelector, { timeout: 15000 });

    // Click and type the content
    await page.click(inputSelector);
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');

    // Use clipboard for large content
    await page.evaluate((text: string) => {
      navigator.clipboard.writeText(text);
    }, content);
    await page.keyboard.down('Control');
    await page.keyboard.press('v');
    await page.keyboard.up('Control');
    await delay(500);

    // Submit
    await page.keyboard.press('Enter');

    // Wait for response
    const response = await waitForGeminiResponse(page);

    await page.close();
    currentSession!.status = 'ready';
    return response;
  } catch (err: any) {
    await page.close().catch(() => {});
    currentSession!.status = 'ready';
    throw new Error(`Gemini interaction failed: ${err.message}`);
  }
}

async function waitForGeminiResponse(page: Page, timeoutMs = 120000): Promise<string> {
  const startTime = Date.now();

  // Wait for the loading indicator to appear then disappear
  await delay(3000);

  // Poll for response completion
  while (Date.now() - startTime < timeoutMs) {
    // Check if still generating
    const isGenerating = await page.evaluate(() => {
      const loadingIndicators = document.querySelectorAll(
        '.loading-indicator, [data-state="streaming"], .generating, mat-progress-bar'
      );
      return loadingIndicators.length > 0;
    });

    if (!isGenerating) {
      await delay(1000);
      break;
    }
    await delay(1000);
  }

  // Extract the last response
  const response = await page.evaluate(() => {
    // Try multiple selectors for Gemini's response
    const selectors = [
      '.response-content:last-child',
      '.model-response-text:last-child',
      '[data-message-author="model"]:last-child .message-content',
      '.markdown-main-panel:last-child',
      'message-content:last-of-type',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }

    // Fallback: get the last substantial text block
    const allText = document.querySelectorAll('[class*="response"], [class*="message"]');
    if (allText.length > 0) {
      return (allText[allText.length - 1] as HTMLElement).innerText?.trim() ?? '';
    }
    return '';
  });

  return response || '(No response captured)';
}

// ── Send to ChatGPT ──────────────────────────────────────────

export async function sendToChatGPT(content: string): Promise<string> {
  if (!browser) await launch();
  if (!browser) throw new Error('Browser not available');

  currentSession!.target = 'chatgpt';
  currentSession!.status = 'busy';
  currentSession!.lastActivity = new Date().toISOString();

  const page: Page = await browser.newPage();

  try {
    await page.goto('https://chatgpt.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Find ChatGPT input
    const inputSelector = '#prompt-textarea, textarea[data-id="root"], [contenteditable="true"][data-placeholder]';
    await page.waitForSelector(inputSelector, { timeout: 15000 });

    await page.click(inputSelector);

    // Use clipboard for content
    await page.evaluate((text: string) => {
      navigator.clipboard.writeText(text);
    }, content);
    await page.keyboard.down('Control');
    await page.keyboard.press('v');
    await page.keyboard.up('Control');
    await delay(500);

    // Submit with Enter (ChatGPT uses Enter to send by default)
    await page.keyboard.press('Enter');

    // Wait for response
    const response = await waitForChatGPTResponse(page);

    await page.close();
    currentSession!.status = 'ready';
    return response;
  } catch (err: any) {
    await page.close().catch(() => {});
    currentSession!.status = 'ready';
    throw new Error(`ChatGPT interaction failed: ${err.message}`);
  }
}

async function waitForChatGPTResponse(page: Page, timeoutMs = 120000): Promise<string> {
  const startTime = Date.now();
  await delay(3000);

  while (Date.now() - startTime < timeoutMs) {
    const isGenerating = await page.evaluate(() => {
      const stopBtn = document.querySelector('[data-testid="stop-button"], button[aria-label="Stop"]');
      return !!stopBtn;
    });

    if (!isGenerating) {
      await delay(1000);
      break;
    }
    await delay(1000);
  }

  const response = await page.evaluate(() => {
    const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      return (lastMsg as HTMLElement).innerText?.trim() ?? '';
    }

    // Fallback
    const allMessages = document.querySelectorAll('.markdown, .prose');
    if (allMessages.length > 0) {
      return (allMessages[allMessages.length - 1] as HTMLElement).innerText?.trim() ?? '';
    }
    return '';
  });

  return response || '(No response captured)';
}

// ── Send files for review ────────────────────────────────────

export async function sendFilesForReview(
  files: { path: string; content: string }[],
  target: ChromeTarget,
  prompt: string
): Promise<string> {
  const fileContent = files
    .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n');

  const fullPrompt = `${prompt}\n\nHere are the changed files:\n\n${fileContent}`;

  if (target === 'gemini') {
    return sendToGemini(fullPrompt);
  } else {
    return sendToChatGPT(fullPrompt);
  }
}
