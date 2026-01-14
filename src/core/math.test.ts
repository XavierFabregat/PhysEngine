import { describe, it, expect } from 'vitest';
import * as math from './math';

describe('math', () => {
  // ============================================================
  // VALUE OPERATIONS
  // ============================================================

  describe('clamp', () => {
    it('should clamp value to minimum', () => {
      expect(math.clamp(5, 10, 20)).toBe(10);
    });

    it('should clamp value to maximum', () => {
      expect(math.clamp(25, 10, 20)).toBe(20);
    });

    it('should return value if within range', () => {
      expect(math.clamp(15, 10, 20)).toBe(15);
    });

    it('should handle value equal to min', () => {
      expect(math.clamp(10, 10, 20)).toBe(10);
    });

    it('should handle value equal to max', () => {
      expect(math.clamp(20, 10, 20)).toBe(20);
    });

    it('should handle negative ranges', () => {
      expect(math.clamp(-15, -10, -5)).toBe(-10);
      expect(math.clamp(-3, -10, -5)).toBe(-5);
      expect(math.clamp(-7, -10, -5)).toBe(-7);
    });

    it('should handle zero in range', () => {
      expect(math.clamp(-5, -10, 10)).toBe(-5);
      expect(math.clamp(5, -10, 10)).toBe(5);
      expect(math.clamp(0, -10, 10)).toBe(0);
    });
  });

  describe('map', () => {
    it('should map value from one range to another', () => {
      expect(math.map(5, 0, 10, 0, 100)).toBe(50);
    });

    it('should handle mapping to different scale', () => {
      expect(math.map(0, 0, 100, 0, 1)).toBe(0);
      expect(math.map(50, 0, 100, 0, 1)).toBe(0.5);
      expect(math.map(100, 0, 100, 0, 1)).toBe(1);
    });

    it('should handle negative ranges', () => {
      expect(math.map(0, -10, 10, 0, 100)).toBe(50);
      expect(math.map(-10, -10, 10, 0, 100)).toBe(0);
      expect(math.map(10, -10, 10, 0, 100)).toBe(100);
    });

    it('should handle inverted output range', () => {
      expect(math.map(0, 0, 10, 10, 0)).toBe(10);
      expect(math.map(5, 0, 10, 10, 0)).toBe(5);
      expect(math.map(10, 0, 10, 10, 0)).toBe(0);
    });

    it('should handle values outside input range (extrapolation)', () => {
      expect(math.map(15, 0, 10, 0, 100)).toBe(150);
      expect(math.map(-5, 0, 10, 0, 100)).toBe(-50);
    });
  });

  describe('sign', () => {
    it('should return 1 for positive numbers', () => {
      expect(math.sign(5)).toBe(1);
      expect(math.sign(0.1)).toBe(1);
      expect(math.sign(1000)).toBe(1);
    });

    it('should return -1 for negative numbers', () => {
      expect(math.sign(-5)).toBe(-1);
      expect(math.sign(-0.1)).toBe(-1);
      expect(math.sign(-1000)).toBe(-1);
    });

    it('should return 0 for zero', () => {
      expect(math.sign(0)).toBe(0);
    });
  });

  // ============================================================
  // INTERPOLATION
  // ============================================================

  describe('lerp', () => {
    it('should return start value when t = 0', () => {
      expect(math.lerp(10, 20, 0)).toBe(10);
    });

    it('should return end value when t = 1', () => {
      expect(math.lerp(10, 20, 1)).toBe(20);
    });

    it('should return midpoint when t = 0.5', () => {
      expect(math.lerp(10, 20, 0.5)).toBe(15);
    });

    it('should interpolate at arbitrary t', () => {
      expect(math.lerp(0, 100, 0.25)).toBe(25);
      expect(math.lerp(0, 100, 0.75)).toBe(75);
    });

    it('should handle negative values', () => {
      expect(math.lerp(-10, 10, 0.5)).toBe(0);
      expect(math.lerp(-20, -10, 0.5)).toBe(-15);
    });

    it('should allow extrapolation with t > 1', () => {
      expect(math.lerp(0, 10, 2)).toBe(20);
    });

    it('should allow extrapolation with t < 0', () => {
      expect(math.lerp(0, 10, -1)).toBe(-10);
    });
  });

  describe('smoothstep', () => {
    it('should return 0 when t = 0', () => {
      expect(math.smoothstep(0)).toBe(0);
    });

    it('should return 1 when t = 1', () => {
      expect(math.smoothstep(1)).toBe(1);
    });

    it('should return smooth midpoint at t = 0.5', () => {
      expect(math.smoothstep(0.5)).toBe(0.5);
    });

    it('should clamp values below 0', () => {
      expect(math.smoothstep(-1)).toBe(0);
    });

    it('should clamp values above 1', () => {
      expect(math.smoothstep(2)).toBe(1);
    });

    it('should produce smooth curve', () => {
      // Should be slower at start
      expect(math.smoothstep(0.1)).toBeLessThan(0.1);
      // Should be faster in middle
      expect(math.smoothstep(0.5)).toBe(0.5);
      // Should be slower at end
      expect(math.smoothstep(0.9)).toBeGreaterThan(0.9);
    });

    it('should have zero derivatives at endpoints', () => {
      // Derivative at t=0 and t=1 should be 0 (smooth start/end)
      const delta = 0.0001;
      const slope0 = (math.smoothstep(delta) - math.smoothstep(0)) / delta;
      const slope1 = (math.smoothstep(1) - math.smoothstep(1 - delta)) / delta;
      expect(slope0).toBeCloseTo(0, 2);
      expect(slope1).toBeCloseTo(0, 2);
    });
  });

  describe('smootherstep', () => {
    it('should return 0 when t = 0', () => {
      expect(math.smootherstep(0)).toBe(0);
    });

    it('should return 1 when t = 1', () => {
      expect(math.smootherstep(1)).toBe(1);
    });

    it('should return smooth midpoint at t = 0.5', () => {
      expect(math.smootherstep(0.5)).toBe(0.5);
    });

    it('should clamp values below 0', () => {
      expect(math.smootherstep(-1)).toBe(0);
    });

    it('should clamp values above 1', () => {
      expect(math.smootherstep(2)).toBe(1);
    });

    it('should be smoother than smoothstep near edges', () => {
      // smootherstep should change even slower near edges
      expect(math.smootherstep(0.1)).toBeLessThan(math.smoothstep(0.1));
      expect(math.smootherstep(0.9)).toBeGreaterThan(math.smoothstep(0.9));
    });
  });

  // ============================================================
  // ANGLE OPERATIONS
  // ============================================================

  describe('degToRad', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(math.degToRad(0)).toBe(0);
    });

    it('should convert 90 degrees to π/2 radians', () => {
      expect(math.degToRad(90)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should convert 180 degrees to π radians', () => {
      expect(math.degToRad(180)).toBeCloseTo(Math.PI, 10);
    });

    it('should convert 360 degrees to 2π radians', () => {
      expect(math.degToRad(360)).toBeCloseTo(2 * Math.PI, 10);
    });

    it('should handle negative degrees', () => {
      expect(math.degToRad(-90)).toBeCloseTo(-Math.PI / 2, 10);
    });

    it('should handle arbitrary angles', () => {
      expect(math.degToRad(45)).toBeCloseTo(Math.PI / 4, 10);
      expect(math.degToRad(270)).toBeCloseTo((3 * Math.PI) / 2, 10);
    });
  });

  describe('radToDeg', () => {
    it('should convert 0 radians to 0 degrees', () => {
      expect(math.radToDeg(0)).toBe(0);
    });

    it('should convert π/2 radians to 90 degrees', () => {
      expect(math.radToDeg(Math.PI / 2)).toBeCloseTo(90, 10);
    });

    it('should convert π radians to 180 degrees', () => {
      expect(math.radToDeg(Math.PI)).toBeCloseTo(180, 10);
    });

    it('should convert 2π radians to 360 degrees', () => {
      expect(math.radToDeg(2 * Math.PI)).toBeCloseTo(360, 10);
    });

    it('should handle negative radians', () => {
      expect(math.radToDeg(-Math.PI / 2)).toBeCloseTo(-90, 10);
    });

    it('should be inverse of degToRad', () => {
      const degrees = 123.456;
      expect(math.radToDeg(math.degToRad(degrees))).toBeCloseTo(degrees, 10);
    });
  });

  describe('normalizeAngle', () => {
    it('should return angle unchanged if in [-π, π]', () => {
      expect(math.normalizeAngle(0)).toBe(0);
      expect(math.normalizeAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2, 10);
      expect(math.normalizeAngle(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 10);
    });

    it('should normalize angle greater than π', () => {
      expect(math.normalizeAngle(Math.PI + 0.5)).toBeCloseTo(-Math.PI + 0.5, 10);
    });

    it('should normalize angle less than -π', () => {
      expect(math.normalizeAngle(-Math.PI - 0.5)).toBeCloseTo(Math.PI - 0.5, 10);
    });

    it('should handle 2π (full circle)', () => {
      expect(math.normalizeAngle(2 * Math.PI)).toBeCloseTo(0, 10);
    });

    it('should handle -2π', () => {
      expect(math.normalizeAngle(-2 * Math.PI)).toBeCloseTo(0, 10);
    });

    it('should handle multiple rotations', () => {
      expect(math.normalizeAngle(5 * Math.PI)).toBeCloseTo(Math.PI, 10);
      expect(math.normalizeAngle(-5 * Math.PI)).toBeCloseTo(-Math.PI, 10);
    });

    it('should handle very large angles', () => {
      const normalized = math.normalizeAngle(100 * Math.PI);
      expect(normalized).toBeGreaterThanOrEqual(-Math.PI);
      expect(normalized).toBeLessThanOrEqual(Math.PI);
    });
  });

  describe('shortestAngleDifference', () => {
    it('should return 0 for same angles', () => {
      expect(math.shortestAngleDifference(0, 0)).toBe(0);
      expect(math.shortestAngleDifference(Math.PI / 4, Math.PI / 4)).toBeCloseTo(0, 10);
    });

    it('should return positive for counter-clockwise rotation', () => {
      expect(math.shortestAngleDifference(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should return negative for clockwise rotation', () => {
      expect(math.shortestAngleDifference(Math.PI / 2, 0)).toBeCloseTo(-Math.PI / 2, 10);
    });

    it('should find shortest path across 0/2π boundary', () => {
      // From -170° to 170° should go through 0° (340° difference = -20° short path)
      const a = math.degToRad(-170);
      const b = math.degToRad(170);
      const diff = math.shortestAngleDifference(a, b);
      expect(Math.abs(diff)).toBeLessThan(Math.PI / 2); // Should be ~20° not ~340°
      expect(diff).toBeCloseTo(math.degToRad(-20), 10);
    });

    it('should never return more than π', () => {
      const a = 0;
      const b = Math.PI + 0.5;
      const diff = math.shortestAngleDifference(a, b);
      expect(Math.abs(diff)).toBeLessThanOrEqual(Math.PI);
    });

    it('should handle full rotations', () => {
      expect(math.shortestAngleDifference(0, 2 * Math.PI)).toBeCloseTo(0, 10);
      expect(math.shortestAngleDifference(0, 4 * Math.PI)).toBeCloseTo(0, 10);
    });
  });

  // ============================================================
  // COMPARISON
  // ============================================================

  describe('approximately', () => {
    it('should return true for identical values', () => {
      expect(math.approximately(5, 5)).toBe(true);
      expect(math.approximately(0, 0)).toBe(true);
      expect(math.approximately(-10, -10)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(math.approximately(5, 6)).toBe(false);
      expect(math.approximately(0, 1)).toBe(false);
    });

    it('should handle floating-point precision with default epsilon', () => {
      expect(math.approximately(1.0, 1.0 + 1e-11)).toBe(true);
      expect(math.approximately(1.0, 1.0 + 1e-9)).toBe(false);
    });

    it('should use custom epsilon', () => {
      expect(math.approximately(1.0, 1.01, 0.1)).toBe(true);
      expect(math.approximately(1.0, 1.01, 0.001)).toBe(false);
    });

    it('should handle negative values', () => {
      expect(math.approximately(-1.0, -1.0 + 1e-11)).toBe(true);
    });

    it('should handle zero comparisons', () => {
      expect(math.approximately(0, 1e-11)).toBe(true);
      expect(math.approximately(0, 1e-9)).toBe(false);
    });
  });

  // ============================================================
  // RANDOM
  // ============================================================

  describe('randomRange', () => {
    it('should return values within range', () => {
      for (let i = 0; i < 100; i++) {
        const value = math.randomRange(0, 10);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(10);
      }
    });

    it('should handle negative ranges', () => {
      for (let i = 0; i < 100; i++) {
        const value = math.randomRange(-10, -5);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThan(-5);
      }
    });

    it('should handle ranges spanning zero', () => {
      for (let i = 0; i < 100; i++) {
        const value = math.randomRange(-5, 5);
        expect(value).toBeGreaterThanOrEqual(-5);
        expect(value).toBeLessThan(5);
      }
    });

    it('should produce different values', () => {
      const values = new Set();
      for (let i = 0; i < 100; i++) {
        values.add(math.randomRange(0, 1000));
      }
      // Should have many unique values (very unlikely to have < 90 duplicates)
      expect(values.size).toBeGreaterThan(90);
    });
  });

  describe('randomInt', () => {
    it('should return integers only', () => {
      for (let i = 0; i < 100; i++) {
        const value = math.randomInt(0, 10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should return values within inclusive range', () => {
      for (let i = 0; i < 100; i++) {
        const value = math.randomInt(0, 10);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(10);
      }
    });

    it('should be able to return min value', () => {
      let foundMin = false;
      for (let i = 0; i < 1000; i++) {
        if (math.randomInt(5, 10) === 5) {
          foundMin = true;
          break;
        }
      }
      expect(foundMin).toBe(true);
    });

    it('should be able to return max value', () => {
      let foundMax = false;
      for (let i = 0; i < 1000; i++) {
        if (math.randomInt(5, 10) === 10) {
          foundMax = true;
          break;
        }
      }
      expect(foundMax).toBe(true);
    });

    it('should handle single value range', () => {
      expect(math.randomInt(5, 5)).toBe(5);
    });

    it('should handle negative ranges', () => {
      for (let i = 0; i < 100; i++) {
        const value = math.randomInt(-10, -5);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThanOrEqual(-5);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
  });

  // ============================================================
  // UTILITIES
  // ============================================================

  describe('square', () => {
    it('should compute square of positive numbers', () => {
      expect(math.square(5)).toBe(25);
      expect(math.square(10)).toBe(100);
      expect(math.square(3)).toBe(9);
    });

    it('should compute square of negative numbers', () => {
      expect(math.square(-5)).toBe(25);
      expect(math.square(-10)).toBe(100);
    });

    it('should handle zero', () => {
      expect(math.square(0)).toBe(0);
    });

    it('should handle fractional values', () => {
      expect(math.square(0.5)).toBe(0.25);
      expect(math.square(1.5)).toBe(2.25);
    });

    it('should handle one', () => {
      expect(math.square(1)).toBe(1);
      expect(math.square(-1)).toBe(1);
    });
  });

  // ============================================================
  // CONSTANTS
  // ============================================================

  describe('constants', () => {
    it('should have correct PI constant', () => {
      expect(math.PI).toBe(Math.PI);
    });

    it('should have correct TWO_PI constant', () => {
      expect(math.TWO_PI).toBeCloseTo(2 * Math.PI, 10);
    });

    it('should have correct HALF_PI constant', () => {
      expect(math.HALF_PI).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should have correct DEG_TO_RAD constant', () => {
      expect(math.DEG_TO_RAD).toBeCloseTo(Math.PI / 180, 10);
    });

    it('should have correct RAD_TO_DEG constant', () => {
      expect(math.RAD_TO_DEG).toBeCloseTo(180 / Math.PI, 10);
    });

    it('should have correct EPSILON constant', () => {
      expect(math.EPSILON).toBe(1e-10);
    });
  });
});

