/**
 * Client-side caching layer for lightning-fast data loading.
 *
 * Three-tier cache:
 *   1. Memory cache   — instant reads, lost on page refresh
 *   2. IndexedDB       — persistent across sessions (images, studio data)
 *   3. HTTP cache      — browser + CDN via Cache-Control headers
 *
 * Stale-While-Revalidate pattern:
 *   - Return stale data immediately from cache
 *   - Fetch fresh data in background
 *   - Update cache + notify subscribers on fresh data
 */

// ── Memory Cache ──────────────────────────────────────────────

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number   // milliseconds
  etag?: string // for conditional revalidation
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxEntries: number

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs: number, etag?: string): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value
      if (oldest) this.cache.delete(oldest)
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs, etag })
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  getStale<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    const isStale = Date.now() - entry.timestamp > entry.ttl
    return { data: entry.data as T, isStale }
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key)
    }
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}


// ── IndexedDB Cache ──────────────────────────────────────────

const DB_NAME = 'loqo-cache'
const DB_VERSION = 1
const STORE_NAME = 'cache'

class IndexedDBCache {
  private dbPromise: Promise<IDBDatabase> | null = null

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return this.dbPromise
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(key)
        request.onsuccess = () => {
          const entry = request.result
          if (!entry) { resolve(null); return }
          if (Date.now() - entry.timestamp > entry.ttl) {
            // Expired but still return for SWR
            resolve(entry.data as T)
            return
          }
          resolve(entry.data as T)
        }
        request.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  }

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    try {
      const db = await this.openDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.put({ key, data, timestamp: Date.now(), ttl: ttlMs })
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    } catch {
      // silently fail
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    } catch {
      // silently fail
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    } catch {
      // silently fail
    }
  }

  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    /** Remove entries older than maxAge (default: 7 days). Returns count removed. */
    try {
      const db = await this.openDB()
      const cutoff = Date.now() - maxAge
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const index = store.index('timestamp')
        const range = IDBKeyRange.upperBound(cutoff)
        const request = index.openCursor(range)
        let count = 0
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            cursor.delete()
            count++
            cursor.continue()
          }
        }
        tx.oncomplete = () => resolve(count)
        tx.onerror = () => resolve(0)
      })
    } catch {
      return 0
    }
  }
}


// ── Subscriber System ────────────────────────────────────────

type CacheListener = (key: string, data: any) => void

class CacheEventBus {
  private listeners = new Map<string, Set<CacheListener>>()

  subscribe(key: string, listener: CacheListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(listener)
    return () => { this.listeners.get(key)?.delete(listener) }
  }

  emit(key: string, data: any): void {
    this.listeners.get(key)?.forEach(fn => fn(key, data))
    // Also emit to wildcard listeners
    this.listeners.get('*')?.forEach(fn => fn(key, data))
  }
}


// ── TTL Presets ─────────────────────────────────────────────

export const CacheTTL = {
  /** 5 minutes — frequently changing data like orders */
  SHORT: 5 * 60 * 1000,
  /** 15 minutes — studio data, beats, shots */
  MEDIUM: 15 * 60 * 1000,
  /** 1 hour — project structure, episodes */
  LONG: 60 * 60 * 1000,
  /** 24 hours — user profile, org data */
  DAY: 24 * 60 * 60 * 1000,
  /** 7 days — CDN image URLs, static assets */
  WEEK: 7 * 24 * 60 * 60 * 1000,
  /** 30 days — immutable assets (versioned images) */
  IMMUTABLE: 30 * 24 * 60 * 60 * 1000,
} as const


// ── Cache Keys ──────────────────────────────────────────────

export const CacheKeys = {
  me: () => 'user:me',
  org: () => 'org:me',
  projects: () => 'projects:list',
  project: (id: string) => `project:${id}`,
  episodes: (projectId: string) => `episodes:${projectId}`,
  episode: (id: string) => `episode:${id}`,
  parts: (episodeId: string) => `parts:${episodeId}`,
  part: (id: string) => `part:${id}`,
  studio: (partId: string) => `studio:${partId}`,
  orders: (partId: string) => `orders:${partId}`,
  order: (id: string) => `order:${id}`,
  image: (id: string) => `image:${id}`,
  imageUrl: (url: string) => `img-url:${url}`,
  user: (id: string) => `user:${id}`,
  asset: (id: string) => `asset:${id}`,
} as const


// ── Main Cache Manager ──────────────────────────────────────

export class CacheManager {
  private memory: MemoryCache
  private db: IndexedDBCache
  private bus: CacheEventBus
  private revalidating = new Set<string>()

  constructor() {
    this.memory = new MemoryCache(500)
    this.db = new IndexedDBCache()
    this.bus = new CacheEventBus()

    // Schedule periodic cleanup
    if (typeof window !== 'undefined') {
      setInterval(() => this.db.cleanup(), 6 * 60 * 60 * 1000) // every 6 hours
    }
  }

  /**
   * Get data with stale-while-revalidate semantics.
   * 1. Check memory cache (instant)
   * 2. Check IndexedDB (fast)
   * 3. Return stale data immediately + revalidate in background
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CacheTTL.MEDIUM,
    options: { persistToDB?: boolean; forceRefresh?: boolean } = {}
  ): Promise<T> {
    const { persistToDB = true, forceRefresh = false } = options

    if (!forceRefresh) {
      // 1. Memory cache (instant)
      const memResult = this.memory.getStale<T>(key)
      if (memResult) {
        if (!memResult.isStale) {
          return memResult.data
        }
        // Stale — return immediately but revalidate in background
        this._revalidateInBackground(key, fetcher, ttl, persistToDB)
        return memResult.data
      }

      // 2. IndexedDB (persistent)
      if (persistToDB) {
        const dbData = await this.db.get<T>(key)
        if (dbData !== null) {
          // Put in memory for next instant read
          this.memory.set(key, dbData, ttl)
          // Revalidate in background
          this._revalidateInBackground(key, fetcher, ttl, persistToDB)
          return dbData
        }
      }
    }

    // 3. Fresh fetch
    const freshData = await fetcher()
    this.memory.set(key, freshData, ttl)
    if (persistToDB) {
      this.db.set(key, freshData, ttl).catch(() => {})
    }
    return freshData
  }

  /**
   * Set data directly (e.g., after a mutation).
   */
  async set<T>(key: string, data: T, ttl: number = CacheTTL.MEDIUM, persistToDB = true): Promise<void> {
    this.memory.set(key, data, ttl)
    if (persistToDB) {
      await this.db.set(key, data, ttl)
    }
    this.bus.emit(key, data)
  }

  /**
   * Invalidate a cache key (both memory and DB).
   */
  async invalidate(key: string): Promise<void> {
    this.memory.invalidate(key)
    await this.db.delete(key)
    this.bus.emit(key, null)
  }

  /**
   * Invalidate all keys matching a pattern.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    this.memory.invalidatePattern(pattern)
    // IndexedDB pattern invalidation requires scanning
    // For now, just clear memory — DB entries will expire
  }

  /**
   * Subscribe to cache updates for a key.
   */
  subscribe(key: string, listener: CacheListener): () => void {
    return this.bus.subscribe(key, listener)
  }

  /**
   * Clear all caches.
   */
  async clearAll(): Promise<void> {
    this.memory.clear()
    await this.db.clear()
  }

  /**
   * Get cache stats for debugging.
   */
  stats(): { memoryEntries: number } {
    return { memoryEntries: this.memory.size }
  }

  // ── Private ────────────────────────────────────────────────

  private _revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    persistToDB: boolean
  ): void {
    if (this.revalidating.has(key)) return
    this.revalidating.add(key)

    fetcher()
      .then(async (freshData) => {
        this.memory.set(key, freshData, ttl)
        if (persistToDB) {
          await this.db.set(key, freshData, ttl)
        }
        this.bus.emit(key, freshData)
      })
      .catch(() => {
        // Silent fail — stale data is already served
      })
      .finally(() => {
        this.revalidating.delete(key)
      })
  }
}


// ── Image URL cache (separate fast lookup for resolved CDN URLs) ──

const imageUrlCache = new Map<string, string>()

export function cacheImageUrl(originalUrl: string, resolvedUrl: string): void {
  imageUrlCache.set(originalUrl, resolvedUrl)
}

export function getCachedImageUrl(url: string): string {
  return imageUrlCache.get(url) || url
}

/**
 * Preload an image into the browser cache.
 * Returns a promise that resolves when the image is loaded.
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { resolve(); return }
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = url
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to preload: ${url}`))
    document.head.appendChild(link)
  })
}

/**
 * Preload multiple images in parallel (batch preloading).
 */
export async function preloadImages(urls: string[], concurrency = 4): Promise<void> {
  const chunks: string[][] = []
  for (let i = 0; i < urls.length; i += concurrency) {
    chunks.push(urls.slice(i, i + concurrency))
  }
  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(preloadImage))
  }
}

// ── Singleton ───────────────────────────────────────────────

export const cacheManager = new CacheManager()
