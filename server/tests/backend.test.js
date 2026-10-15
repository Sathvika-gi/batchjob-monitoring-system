import { calculateDurationStats } from '../src/prediction/predictionService.js';
import { isValidTransition } from '../src/engine/executionEngine.js';

describe('Execution Lifecycle & Statistics Tests', () => {
  describe('Duration Statistics', () => {
    test('calculates correct average and median for samples', () => {
      const durations = [1000, 2000, 3000, 4000, 5000];
      const stats = calculateDurationStats(durations);

      expect(stats).toBeDefined();
      expect(stats.avg).toBe(3000);
      expect(stats.median).toBe(3000);
      expect(stats.sampleCount).toBe(5);
    });

    test('returns null for empty duration array', () => {
      const stats = calculateDurationStats([]);
      expect(stats).toBeNull();
    });

    test('calculates accurate even-length median', () => {
      const durations = [100, 200, 300, 400];
      const stats = calculateDurationStats(durations);
      expect(stats.median).toBe(250);
    });
  });

  describe('Execution State Transition Validation', () => {
    test('allows valid execution transitions', () => {
      expect(isValidTransition('queued', 'running')).toBe(true);
      expect(isValidTransition('running', 'success')).toBe(true);
      expect(isValidTransition('running', 'failed')).toBe(true);
      expect(isValidTransition('running', 'timed_out')).toBe(true);
      expect(isValidTransition('blocked', 'queued')).toBe(true);
    });

    test('rejects illegal status transitions', () => {
      expect(isValidTransition('success', 'running')).toBe(false);
      expect(isValidTransition('failed', 'running')).toBe(false);
      expect(isValidTransition('queued', 'success')).toBe(false);
    });
  });
});
