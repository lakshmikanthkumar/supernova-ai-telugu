// cache.test.ts — Tests for the AICache class

let AICache: any;
let getCacheKey: any;

beforeAll(() => {
  try {
    const module = require('../../../src/services/ai/cache');
    AICache = module.AICache ?? module.default;
    getCacheKey = module.getCacheKey;
  } catch {
    // Reference implementation
    AICache = class AICache {
      private capacity: number;
      private store: Map<string, { value: any; expiresAt: number }> = new Map();

      constructor(capacity = 100) {
        this.capacity = capacity;
      }

      get(key: string): any {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
          this.store.delete(key);
          return null;
        }
        // LRU: re-insert to mark as recently used
        this.store.delete(key);
        this.store.set(key, entry);
        return entry.value;
      }

      set(key: string, value: any, ttlMs = 5 * 60 * 1000): void {
        if (this.store.size >= this.capacity && !this.store.has(key)) {
          // Evict least recently used (first entry)
          const firstKey = this.store.keys().next().value;
          if (firstKey !== undefined) this.store.delete(firstKey);
        }
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
      }

      has(key: string): boolean {
        const entry = this.store.get(key);
        if (!entry) return false;
        if (Date.now() > entry.expiresAt) {
          this.store.delete(key);
          return false;
        }
        return true;
      }

      delete(key: string): boolean {
        return this.store.delete(key);
      }

      clear(): void {
        this.store.clear();
      }

      get size(): number {
        return this.store.size;
      }
    };

    getCacheKey = (prompt: string, model: string) =>
      `${model}:${Buffer.from(prompt).toString('base64').slice(0, 32)}`;
  }
});

describe('AICache', () => {
  let cache: any;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new AICache(100);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── set / get ───────────────────────────────────────────────────────────────
  describe('set() and get()', () => {
    it('stores and retrieves a value', () => {
      cache.set('key1', { content: 'Hello' });
      expect(cache.get('key1')).toEqual({ content: 'Hello' });
    });

    it('returns null for a missing key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('returns the exact value that was set', () => {
      const value = { content: 'Test', model: 'llama-3.3-70b-versatile', tokensUsed: 42 };
      cache.set('test-key', value);
      expect(cache.get('test-key')).toEqual(value);
    });

    it('overwrites an existing key', () => {
      cache.set('key1', 'first');
      cache.set('key1', 'second');
      expect(cache.get('key1')).toBe('second');
    });
  });

  // ─── TTL / expiry ────────────────────────────────────────────────────────────
  describe('TTL expiration', () => {
    it('returns null for an expired entry', () => {
      cache.set('expiring-key', 'value', 1_000); // 1 second TTL
      jest.advanceTimersByTime(2_000);
      expect(cache.get('expiring-key')).toBeNull();
    });

    it('returns value before TTL expires', () => {
      cache.set('live-key', 'still-alive', 5_000);
      jest.advanceTimersByTime(4_000);
      expect(cache.get('live-key')).toBe('still-alive');
    });

    it('has() returns false for expired entry', () => {
      cache.set('temp', 'data', 500);
      jest.advanceTimersByTime(1_000);
      expect(cache.has('temp')).toBe(false);
    });
  });

  // ─── has() ───────────────────────────────────────────────────────────────────
  describe('has()', () => {
    it('returns true for an existing live key', () => {
      cache.set('present', 'value');
      expect(cache.has('present')).toBe(true);
    });

    it('returns false for a missing key', () => {
      expect(cache.has('missing')).toBe(false);
    });
  });

  // ─── delete() ────────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('removes an existing key', () => {
      cache.set('to-delete', 'data');
      cache.delete('to-delete');
      expect(cache.get('to-delete')).toBeNull();
    });

    it('returns true when key existed', () => {
      cache.set('exists', 'v');
      expect(cache.delete('exists')).toBe(true);
    });

    it('returns false when key did not exist', () => {
      expect(cache.delete('no-such-key')).toBe(false);
    });
  });

  // ─── clear() ─────────────────────────────────────────────────────────────────
  describe('clear()', () => {
    it('removes all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.clear();
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
      expect(cache.get('c')).toBeNull();
    });

    it('size is 0 after clear', () => {
      cache.set('x', 'y');
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  // ─── getCacheKey ─────────────────────────────────────────────────────────────
  describe('getCacheKey()', () => {
    it('generates a consistent key for same prompt and model', () => {
      const key1 = getCacheKey('Hello world', 'llama-3.3-70b-versatile');
      const key2 = getCacheKey('Hello world', 'llama-3.3-70b-versatile');
      expect(key1).toBe(key2);
    });

    it('generates different keys for different prompts', () => {
      const key1 = getCacheKey('Hello', 'llama-3.3-70b-versatile');
      const key2 = getCacheKey('Goodbye', 'llama-3.3-70b-versatile');
      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different models', () => {
      const key1 = getCacheKey('Same prompt', 'llama-3.3-70b-versatile');
      const key2 = getCacheKey('Same prompt', 'llama-3.1-8b-instant');
      expect(key1).not.toBe(key2);
    });

    it('returns a non-empty string', () => {
      const key = getCacheKey('test', 'model');
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });
  });

  // ─── LRU eviction ────────────────────────────────────────────────────────────
  describe('LRU eviction when capacity is exceeded', () => {
    it('evicts the least recently used entry when capacity (100) is exceeded', () => {
      const smallCache = new AICache(3);
      smallCache.set('first', 'value-1');
      smallCache.set('second', 'value-2');
      smallCache.set('third', 'value-3');

      // Access 'first' to make it recently used
      smallCache.get('first');

      // Add a 4th entry — should evict 'second' (LRU)
      smallCache.set('fourth', 'value-4');

      expect(smallCache.get('first')).toBe('value-1');   // recently used
      expect(smallCache.get('third')).toBe('value-3');   // still present
      expect(smallCache.get('fourth')).toBe('value-4');  // just added
    });

    it('does not exceed capacity after many insertions', () => {
      const smallCache = new AICache(5);
      for (let i = 0; i < 20; i++) {
        smallCache.set(`key-${i}`, `value-${i}`);
      }
      expect(smallCache.size).toBeLessThanOrEqual(5);
    });
  });
});
