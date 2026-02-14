import { appendRenderLog, getRenderLog, clearRenderLog } from './renderDebugLog';

// Mock localStorage for Node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

describe('renderDebugLog', () => {
  const KEY = 'github-issue-graph-render-log';

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('appendRenderLog', () => {
    it('appends a log line with timestamp', () => {
      appendRenderLog('Test message');

      const log = localStorageMock.getItem(KEY);
      expect(log).toBeTruthy();
      expect(log).toContain('Test message');
      expect(log).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('appends multiple log lines', () => {
      appendRenderLog('First message');
      appendRenderLog('Second message');
      appendRenderLog('Third message');

      const log = localStorageMock.getItem(KEY);
      expect(log).toContain('First message');
      expect(log).toContain('Second message');
      expect(log).toContain('Third message');
    });

    it('limits log to MAX_LINES (200)', () => {
      for (let i = 0; i < 250; i++) {
        appendRenderLog(`Message ${i}`);
      }

      const log = localStorageMock.getItem(KEY);
      const lines = log!.split('\n').filter(Boolean);

      expect(lines.length).toBeLessThanOrEqual(200);
      // Should have the most recent messages
      expect(log).toContain('Message 249');
      expect(log).toContain('Message 200');
      // Should not have the oldest messages
      expect(log).not.toContain('Message 0 ');
    });

    it('handles localStorage.setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => appendRenderLog('Test')).not.toThrow();
    });
  });

  describe('getRenderLog', () => {
    it('returns empty placeholder when no logs', () => {
      const result = getRenderLog();
      expect(result).toBe('(empty)');
    });

    it('returns all log lines joined by newline', () => {
      appendRenderLog('Line 1');
      appendRenderLog('Line 2');
      appendRenderLog('Line 3');

      const result = getRenderLog();
      const lines = result.split('\n');

      expect(lines).toHaveLength(3);
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
    });

    it('handles localStorage.getItem errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const result = getRenderLog();
      expect(result).toBe('(empty)');
    });

    it('filters empty lines', () => {
      localStorageMock.setItem(KEY, 'Line 1\n\n\nLine 2\n\n');

      const result = getRenderLog();
      const lines = result.split('\n');

      expect(lines).toHaveLength(2);
    });
  });

  describe('clearRenderLog', () => {
    it('removes the log from localStorage', () => {
      appendRenderLog('Test message');
      expect(localStorageMock.getItem(KEY)).toBeTruthy();

      clearRenderLog();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(KEY);
    });

    it('handles localStorage.removeItem errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => clearRenderLog()).not.toThrow();
    });

    it('works when log does not exist', () => {
      expect(() => clearRenderLog()).not.toThrow();
    });
  });

  describe('integration flow', () => {
    it('supports append, get, and clear cycle', () => {
      appendRenderLog('Start process');
      appendRenderLog('Middle process');
      appendRenderLog('End process');

      let log = getRenderLog();
      expect(log).toContain('Start process');
      expect(log).toContain('End process');

      clearRenderLog();

      log = getRenderLog();
      expect(log).toBe('(empty)');
    });
  });
});
