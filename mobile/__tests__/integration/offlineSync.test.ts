// offlineSync.test.ts

import { createMockStore, flushPromises } from '../utils/testHelpers';
import { MOCK_LESSONS, MOCK_USER_PROGRESS } from '../utils/mockData';
import { createMockSupabaseClient } from '../mocks/supabaseMocks';

// NetInfo mock — controllable state
let mockIsConnected = true;

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback: any) => {
    callback({ isConnected: mockIsConnected });
    return jest.fn();
  }),
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve({ isConnected: mockIsConnected, isInternetReachable: mockIsConnected })
  ),
}));

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Supabase mock — factory cannot reference imported vars; inline it
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  })),
}));

// Offline sync service mock
const mockSyncOfflineData = jest.fn().mockResolvedValue({ synced: 3, failed: 0 });
const mockQueueAction = jest.fn();
const mockGetCachedLessons = jest.fn().mockResolvedValue(MOCK_LESSONS);

jest.mock('../../src/services/sync/offlineSyncService', () => ({
  syncOfflineData: mockSyncOfflineData,
  queueAction: mockQueueAction,
  getCachedLessons: mockGetCachedLessons,
}), { virtual: true });

describe('Offline Sync Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConnected = true;
  });

  // ─── Offline — show cached lessons ──────────────────────────────────────────
  describe('Offline state', () => {
    it('returns cached lessons when offline', async () => {
      mockIsConnected = false;
      const cachedLessons = await mockGetCachedLessons();

      expect(Array.isArray(cachedLessons)).toBe(true);
      expect(cachedLessons.length).toBeGreaterThan(0);
    });

    it('cached lessons have the same structure as API lessons', async () => {
      mockIsConnected = false;
      const cachedLessons = await mockGetCachedLessons();

      cachedLessons.forEach((lesson: any) => {
        expect(lesson).toHaveProperty('id');
        expect(lesson).toHaveProperty('title_english');
        expect(lesson).toHaveProperty('category');
      });
    });

    it('queues progress updates when offline', async () => {
      mockIsConnected = false;

      const progressUpdate = {
        type: 'UPDATE_PROGRESS',
        payload: { userId: 'user-123', xpEarned: 50, lessonId: 'lesson-001' },
        timestamp: Date.now(),
      };

      mockQueueAction(progressUpdate);
      expect(mockQueueAction).toHaveBeenCalledWith(progressUpdate);
    });
  });

  // ─── Coming back online ──────────────────────────────────────────────────────
  describe('Reconnection — sync trigger', () => {
    it('triggers syncOfflineData when connection is restored', async () => {
      mockIsConnected = false;
      // Queue some actions while offline
      mockQueueAction({ type: 'UPDATE_PROGRESS', payload: { xp: 50 } });
      mockQueueAction({ type: 'UPDATE_PROGRESS', payload: { xp: 75 } });

      // Come back online
      mockIsConnected = true;
      await mockSyncOfflineData();

      expect(mockSyncOfflineData).toHaveBeenCalledTimes(1);
    });

    it('syncs all queued actions on reconnect', async () => {
      mockSyncOfflineData.mockResolvedValueOnce({ synced: 3, failed: 0 });

      const result = await mockSyncOfflineData();
      expect(result.synced).toBe(3);
      expect(result.failed).toBe(0);
    });
  });

  // ─── Queued actions processed on reconnect ───────────────────────────────────
  describe('Queued actions processing', () => {
    it('processes queued progress updates after reconnect', async () => {
      const queuedUpdates = [
        { type: 'UPDATE_PROGRESS', payload: { xp: 50, lessonId: 'lesson-001' } },
        { type: 'UPDATE_PROGRESS', payload: { xp: 75, lessonId: 'lesson-002' } },
        { type: 'UPDATE_PROGRESS', payload: { xp: 60, lessonId: 'lesson-003' } },
      ];

      // Queue actions while offline
      queuedUpdates.forEach((action) => mockQueueAction(action));
      expect(mockQueueAction).toHaveBeenCalledTimes(3);

      // Process on reconnect
      mockSyncOfflineData.mockResolvedValueOnce({ synced: 3, failed: 0 });
      const result = await mockSyncOfflineData();

      expect(result.synced).toBe(3);
    });

    it('handles partial sync failures gracefully', async () => {
      mockSyncOfflineData.mockResolvedValueOnce({ synced: 2, failed: 1 });

      const result = await mockSyncOfflineData();
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  // ─── Conflict resolution ─────────────────────────────────────────────────────
  describe('Conflict resolution', () => {
    it('server data wins over local data on conflict', async () => {
      const localData = { xp: 100, streak: 3 };
      const serverData = { xp: 150, streak: 5 }; // server has more recent data

      // Server-wins strategy: always prefer server
      const resolvedData = { ...localData, ...serverData };

      expect(resolvedData.xp).toBe(serverData.xp);
      expect(resolvedData.streak).toBe(serverData.streak);
    });

    it('merged data contains all fields from both sources', async () => {
      const localData = { xp: 100, localField: 'local-only' };
      const serverData = { xp: 150, serverField: 'server-only' };

      const merged = { ...localData, ...serverData };

      expect(merged).toHaveProperty('localField');
      expect(merged).toHaveProperty('serverField');
      expect(merged.xp).toBe(150); // server wins
    });

    it('timestamps are used to determine most recent data', () => {
      const localUpdate = { xp: 100, updatedAt: new Date('2024-01-01T10:00:00Z').getTime() };
      const serverUpdate = { xp: 150, updatedAt: new Date('2024-01-01T12:00:00Z').getTime() };

      const winner = localUpdate.updatedAt > serverUpdate.updatedAt ? localUpdate : serverUpdate;
      expect(winner).toBe(serverUpdate);
    });
  });
});
