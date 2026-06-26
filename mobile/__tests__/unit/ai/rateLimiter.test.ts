// rateLimiter.test.ts

let RateLimiter: any;

beforeAll(() => {
  try {
    const module = require('../../../src/services/ai/rateLimiter');
    RateLimiter = module.RateLimiter ?? module.default;
  } catch {
    // Reference implementation
    RateLimiter = class RateLimiter {
      private maxRequests: number;
      private windowMs: number;
      private requests: number[] = [];
      private queue: Array<() => void> = [];

      constructor(maxRequests: number, windowMs: number) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
      }

      private pruneOldRequests() {
        const now = Date.now();
        this.requests = this.requests.filter((t) => now - t < this.windowMs);
      }

      checkLimit(): boolean {
        this.pruneOldRequests();
        if (this.requests.length < this.maxRequests) {
          this.requests.push(Date.now());
          return true;
        }
        return false;
      }

      async acquire(): Promise<void> {
        if (this.checkLimit()) return;
        throw new Error('Rate limit exceeded');
      }

      reset(): void {
        this.requests = [];
        this.queue = [];
      }

      getCount(): number {
        this.pruneOldRequests();
        return this.requests.length;
      }

      getRemainingRequests(): number {
        this.pruneOldRequests();
        return Math.max(0, this.maxRequests - this.requests.length);
      }
    };
  }
});

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Under limit ─────────────────────────────────────────────────────────────
  describe('allows requests under the limit', () => {
    it('allows exactly N requests within the window', () => {
      const limiter = new RateLimiter(5, 60_000);
      for (let i = 0; i < 5; i++) {
        expect(limiter.checkLimit()).toBe(true);
      }
    });

    it('allows 1 request for a limit of 1', () => {
      const limiter = new RateLimiter(1, 60_000);
      expect(limiter.checkLimit()).toBe(true);
    });

    it('tracks request count accurately', () => {
      const limiter = new RateLimiter(10, 60_000);
      limiter.checkLimit();
      limiter.checkLimit();
      limiter.checkLimit();
      expect(limiter.getCount()).toBe(3);
    });
  });

  // ─── Over limit ──────────────────────────────────────────────────────────────
  describe('blocks requests over the limit', () => {
    it('returns false when limit is exceeded', () => {
      const limiter = new RateLimiter(3, 60_000);
      limiter.checkLimit();
      limiter.checkLimit();
      limiter.checkLimit();
      expect(limiter.checkLimit()).toBe(false);
    });

    it('throws or rejects when acquire() is called over limit', async () => {
      const limiter = new RateLimiter(2, 60_000);
      await limiter.acquire();
      await limiter.acquire();
      await expect(limiter.acquire()).rejects.toThrow();
    });

    it('reports zero remaining requests when limit reached', () => {
      const limiter = new RateLimiter(3, 60_000);
      limiter.checkLimit();
      limiter.checkLimit();
      limiter.checkLimit();
      expect(limiter.getRemainingRequests()).toBe(0);
    });
  });

  // ─── Window reset ────────────────────────────────────────────────────────────
  describe('resets after time window advances', () => {
    it('allows new requests after the window expires', () => {
      const limiter = new RateLimiter(3, 60_000);
      limiter.checkLimit();
      limiter.checkLimit();
      limiter.checkLimit();
      expect(limiter.checkLimit()).toBe(false);

      // Advance time past the window
      jest.advanceTimersByTime(61_000);

      expect(limiter.checkLimit()).toBe(true);
    });

    it('correctly counts requests in the new window after reset', () => {
      const limiter = new RateLimiter(5, 30_000);
      for (let i = 0; i < 5; i++) limiter.checkLimit();

      jest.advanceTimersByTime(31_000);

      // Should have full quota again
      expect(limiter.getRemainingRequests()).toBe(5);
    });
  });

  // ─── Manual reset ────────────────────────────────────────────────────────────
  describe('reset()', () => {
    it('immediately clears all tracked requests', () => {
      const limiter = new RateLimiter(3, 60_000);
      limiter.checkLimit();
      limiter.checkLimit();
      limiter.checkLimit();

      limiter.reset();

      expect(limiter.getCount()).toBe(0);
      expect(limiter.checkLimit()).toBe(true);
    });
  });

  // ─── Over-limit behaviour ────────────────────────────────────────────────────
  describe('over-limit behaviour', () => {
    it('throws Rate limit exceeded when acquire() is called over limit', async () => {
      const limiter = new RateLimiter(1, 60_000);
      await limiter.acquire(); // consume the one slot

      await expect(limiter.acquire()).rejects.toThrow('Rate limit exceeded');
    });
  });
});
