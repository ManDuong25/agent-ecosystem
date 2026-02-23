/**
 * FileWatcher – uses chokidar to watch a repository for file changes.
 * Emits events via callback so the WebSocket layer can broadcast them.
 */

import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import type { FileChange } from '../../shared/types.js';
import { cache } from './cache.js';

const IGNORED_PATTERNS = [
  '**/node_modules/**', '**/.git/**', '**/__pycache__/**',
  '**/.next/**', '**/.nuxt/**', '**/dist/**', '**/build/**',
  '**/.venv/**', '**/venv/**', '**/coverage/**', '**/.cache/**',
];

interface WatchSession {
  watcher: FSWatcher;
  repoPath: string;
  changes: FileChange[];
  listeners: Set<(change: FileChange) => void>;
}

const sessions = new Map<string, WatchSession>();

export function startWatching(
  repoPath: string,
  onChange: (change: FileChange) => void
): void {
  const absPath = path.resolve(repoPath);

  // Don't duplicate watchers
  if (sessions.has(absPath)) {
    sessions.get(absPath)!.listeners.add(onChange);
    return;
  }

  const watcher = chokidar.watch(absPath, {
    ignored: IGNORED_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  const session: WatchSession = {
    watcher,
    repoPath: absPath,
    changes: [],
    listeners: new Set([onChange]),
  };

  const handleEvent = (type: FileChange['type']) => (filePath: string) => {
    const change: FileChange = {
      path: filePath,
      relativePath: path.relative(absPath, filePath),
      type,
      timestamp: new Date().toISOString(),
    };
    session.changes.push(change);
    // Keep only last 500 changes
    if (session.changes.length > 500) session.changes.shift();
    // Invalidate cache for this repo
    cache.onFileChange(absPath);
    // Notify all listeners
    for (const listener of session.listeners) {
      listener(change);
    }
  };

  watcher.on('add', handleEvent('added'));
  watcher.on('change', handleEvent('modified'));
  watcher.on('unlink', handleEvent('deleted'));

  sessions.set(absPath, session);
}

export function stopWatching(repoPath: string): void {
  const absPath = path.resolve(repoPath);
  const session = sessions.get(absPath);
  if (session) {
    session.watcher.close();
    sessions.delete(absPath);
  }
}

export function getChangedFiles(repoPath: string, since?: string): FileChange[] {
  const absPath = path.resolve(repoPath);
  const session = sessions.get(absPath);
  if (!session) return [];

  if (since) {
    const sinceDate = new Date(since).getTime();
    return session.changes.filter(c => new Date(c.timestamp).getTime() > sinceDate);
  }
  return [...session.changes];
}

export function clearChanges(repoPath: string): void {
  const absPath = path.resolve(repoPath);
  const session = sessions.get(absPath);
  if (session) session.changes = [];
}

export function isWatching(repoPath: string): boolean {
  return sessions.has(path.resolve(repoPath));
}

export function getWatchedRepos(): string[] {
  return Array.from(sessions.keys());
}

export function stopAll(): void {
  for (const session of sessions.values()) {
    session.watcher.close();
  }
  sessions.clear();
}
