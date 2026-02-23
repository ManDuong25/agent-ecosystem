/**
 * SessionCache – in-memory cache with TTL and file-change invalidation.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

export class SessionCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTLMs = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTLMs;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, tags: string[] = [], ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
      tags,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateByTag(tag: string): void {
    for (const [key, entry] of this.store) {
      if (entry.tags.includes(tag)) this.store.delete(key);
    }
  }

  invalidateByPattern(pattern: string): void {
    const re = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (re.test(key)) this.store.delete(key);
    }
  }

  /** Invalidate all entries associated with a repo when files change. */
  onFileChange(repoPath: string): void {
    this.invalidateByTag(`repo:${repoPath}`);
  }

  clear(): void {
    this.store.clear();
  }

  stats() {
    let valid = 0;
    let expired = 0;
    const now = Date.now();
    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) expired++;
      else valid++;
    }
    return { total: this.store.size, valid, expired };
  }
}

export const cache = new SessionCache();
