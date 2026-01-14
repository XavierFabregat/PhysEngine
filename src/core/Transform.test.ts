import { describe, it, expect } from 'vitest';
import * as Transform from './Transform';

describe('Transform', () => {
  // ============================================================
  // CREATION
  // ============================================================

  describe('create', () => {
    it('should create a transform with given position and rotation', () => {
      const t = Transform.create({ x: 100, y: 50 }, Math.PI / 4);
      expect(t.position.x).toBe(100);
      expect(t.position.y).toBe(50);
      expect(t.rotation).toBe(Math.PI / 4);
    });

    it('should default rotation to 0 if not provided', () => {
      const t = Transform.create({ x: 10, y: 20 });
      expect(t.rotation).toBe(0);
    });

    it('should handle negative positions', () => {
      const t = Transform.create({ x: -50, y: -100 }, Math.PI);
      expect(t.position.x).toBe(-50);
      expect(t.position.y).toBe(-100);
    });

    it('should handle negative rotations', () => {
      const t = Transform.create({ x: 0, y: 0 }, -Math.PI / 2);
      expect(t.rotation).toBe(-Math.PI / 2);
    });
  });

  describe('identity', () => {
    it('should create transform at origin with no rotation', () => {
      const t = Transform.identity();
      expect(t.position.x).toBe(0);
      expect(t.position.y).toBe(0);
      expect(t.rotation).toBe(0);
    });
  });

  describe('clone', () => {
    it('should create a copy of a transform', () => {
      const original = Transform.create({ x: 100, y: 200 }, Math.PI / 3);
      const copy = Transform.clone(original);
      expect(copy.position.x).toBe(100);
      expect(copy.position.y).toBe(200);
      expect(copy.rotation).toBe(Math.PI / 3);
    });

    it('should create a new instance (not reference)', () => {
      const original = Transform.create({ x: 100, y: 200 }, Math.PI / 3);
      const copy = Transform.clone(original);
      expect(copy).not.toBe(original);
      expect(copy.position).not.toBe(original.position);
    });
  });

  // ============================================================
  // SPACE CONVERSION - POINTS
  // ============================================================

  describe('transformPoint', () => {
    it('should return position when transforming origin', () => {
      const t = Transform.create({ x: 100, y: 50 }, 0);
      const result = Transform.transformPoint(t, { x: 0, y: 0 });
      expect(result.x).toBeCloseTo(100, 10);
      expect(result.y).toBeCloseTo(50, 10);
    });

    it('should only translate when rotation is 0', () => {
      const t = Transform.create({ x: 100, y: 50 }, 0);
      const result = Transform.transformPoint(t, { x: 10, y: 20 });
      expect(result.x).toBeCloseTo(110, 10);
      expect(result.y).toBeCloseTo(70, 10);
    });

    it('should rotate point by 90 degrees counter-clockwise', () => {
      const t = Transform.create({ x: 0, y: 0 }, Math.PI / 2);
      const result = Transform.transformPoint(t, { x: 10, y: 0 });
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(10, 10);
    });

    it('should rotate point by 180 degrees', () => {
      const t = Transform.create({ x: 0, y: 0 }, Math.PI);
      const result = Transform.transformPoint(t, { x: 10, y: 5 });
      expect(result.x).toBeCloseTo(-10, 10);
      expect(result.y).toBeCloseTo(-5, 10);
    });

    it('should rotate and translate', () => {
      const t = Transform.create({ x: 100, y: 100 }, Math.PI / 2);
      const result = Transform.transformPoint(t, { x: 10, y: 0 });
      expect(result.x).toBeCloseTo(100, 10);
      expect(result.y).toBeCloseTo(110, 10);
    });

    it('should handle negative local coordinates', () => {
      const t = Transform.create({ x: 50, y: 50 }, 0);
      const result = Transform.transformPoint(t, { x: -10, y: -20 });
      expect(result.x).toBeCloseTo(40, 10);
      expect(result.y).toBeCloseTo(30, 10);
    });

    it('should handle 45-degree rotation', () => {
      const t = Transform.create({ x: 0, y: 0 }, Math.PI / 4);
      const result = Transform.transformPoint(t, { x: 1, y: 0 });
      expect(result.x).toBeCloseTo(Math.sqrt(2) / 2, 10);
      expect(result.y).toBeCloseTo(Math.sqrt(2) / 2, 10);
    });
  });

  describe('inverseTransformPoint', () => {
    it('should be inverse of transformPoint', () => {
      const t = Transform.create({ x: 100, y: 50 }, Math.PI / 4);
      const local = { x: 10, y: 20 };
      const world = Transform.transformPoint(t, local);
      const backToLocal = Transform.inverseTransformPoint(t, world);
      expect(backToLocal.x).toBeCloseTo(local.x, 10);
      expect(backToLocal.y).toBeCloseTo(local.y, 10);
    });

    it('should convert position to origin when transforming position', () => {
      const t = Transform.create({ x: 100, y: 50 }, 0);
      const result = Transform.inverseTransformPoint(t, t.position);
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });

    it('should handle rotation correctly', () => {
      const t = Transform.create({ x: 0, y: 0 }, Math.PI / 2);
      const result = Transform.inverseTransformPoint(t, { x: 0, y: 10 });
      expect(result.x).toBeCloseTo(10, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });

    it('should handle translation and rotation', () => {
      const t = Transform.create({ x: 100, y: 100 }, Math.PI / 2);
      const result = Transform.inverseTransformPoint(t, { x: 100, y: 110 });
      expect(result.x).toBeCloseTo(10, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });

    it('should work with identity transform', () => {
      const t = Transform.identity();
      const point = { x: 50, y: 75 };
      const result = Transform.inverseTransformPoint(t, point);
      expect(result.x).toBeCloseTo(50, 10);
      expect(result.y).toBeCloseTo(75, 10);
    });
  });

  describe('transformPoint and inverseTransformPoint round-trip', () => {
    it('should maintain point through forward-inverse transform', () => {
      const transforms = [
        Transform.create({ x: 100, y: 50 }, 0),
        Transform.create({ x: -50, y: 100 }, Math.PI / 4),
        Transform.create({ x: 0, y: 0 }, Math.PI / 2),
        Transform.create({ x: 200, y: -100 }, -Math.PI / 3),
      ];

      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: -15, y: -25 },
        { x: 100, y: 200 },
      ];

      for (const t of transforms) {
        for (const local of points) {
          const world = Transform.transformPoint(t, local);
          const backToLocal = Transform.inverseTransformPoint(t, world);
          expect(backToLocal.x).toBeCloseTo(local.x, 10);
          expect(backToLocal.y).toBeCloseTo(local.y, 10);
        }
      }
    });
  });

  // ============================================================
  // SPACE CONVERSION - DIRECTIONS
  // ============================================================

  describe('transformDirection', () => {
    it('should not translate direction vectors', () => {
      const t = Transform.create({ x: 100, y: 50 }, 0);
      const result = Transform.transformDirection(t, { x: 1, y: 0 });
      expect(result.x).toBeCloseTo(1, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });

    it('should rotate direction by 90 degrees', () => {
      const t = Transform.create({ x: 0, y: 0 }, Math.PI / 2);
      const result = Transform.transformDirection(t, { x: 1, y: 0 });
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(1, 10);
    });

    it('should rotate direction by 180 degrees', () => {
      const t = Transform.create({ x: 100, y: 100 }, Math.PI);
      const result = Transform.transformDirection(t, { x: 1, y: 1 });
      expect(result.x).toBeCloseTo(-1, 10);
      expect(result.y).toBeCloseTo(-1, 10);
    });

    it('should preserve direction magnitude', () => {
      const t = Transform.create({ x: 50, y: 50 }, Math.PI / 4);
      const dir = { x: 3, y: 4 }; // magnitude 5
      const result = Transform.transformDirection(t, dir);
      const magnitude = Math.sqrt(result.x * result.x + result.y * result.y);
      expect(magnitude).toBeCloseTo(5, 10);
    });

    it('should handle zero rotation', () => {
      const t = Transform.create({ x: 100, y: 100 }, 0);
      const result = Transform.transformDirection(t, { x: 5, y: 10 });
      expect(result.x).toBeCloseTo(5, 10);
      expect(result.y).toBeCloseTo(10, 10);
    });
  });

  describe('inverseTransformDirection', () => {
    it('should be inverse of transformDirection', () => {
      const t = Transform.create({ x: 100, y: 50 }, Math.PI / 3);
      const local = { x: 3, y: 4 };
      const world = Transform.transformDirection(t, local);
      const backToLocal = Transform.inverseTransformDirection(t, world);
      expect(backToLocal.x).toBeCloseTo(local.x, 10);
      expect(backToLocal.y).toBeCloseTo(local.y, 10);
    });

    it('should not be affected by position', () => {
      const t1 = Transform.create({ x: 0, y: 0 }, Math.PI / 4);
      const t2 = Transform.create({ x: 1000, y: 1000 }, Math.PI / 4);
      const dir = { x: 5, y: 5 };
      const result1 = Transform.inverseTransformDirection(t1, dir);
      const result2 = Transform.inverseTransformDirection(t2, dir);
      expect(result1.x).toBeCloseTo(result2.x, 10);
      expect(result1.y).toBeCloseTo(result2.y, 10);
    });
  });

  // ============================================================
  // TRANSFORM OPERATIONS
  // ============================================================

  describe('compose', () => {
    it('should compose two transforms with no rotation', () => {
      const a = Transform.create({ x: 100, y: 50 }, 0);
      const b = Transform.create({ x: 10, y: 20 }, 0);
      const result = Transform.compose(a, b);
      expect(result.position.x).toBeCloseTo(110, 10);
      expect(result.position.y).toBeCloseTo(70, 10);
      expect(result.rotation).toBeCloseTo(0, 10);
    });

    it('should add rotations', () => {
      const a = Transform.create({ x: 0, y: 0 }, Math.PI / 4);
      const b = Transform.create({ x: 0, y: 0 }, Math.PI / 4);
      const result = Transform.compose(a, b);
      expect(result.rotation).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should rotate child position by parent rotation', () => {
      const a = Transform.create({ x: 0, y: 0 }, Math.PI / 2);
      const b = Transform.create({ x: 10, y: 0 }, 0);
      const result = Transform.compose(a, b);
      expect(result.position.x).toBeCloseTo(0, 10);
      expect(result.position.y).toBeCloseTo(10, 10);
    });

    it('should handle complete hierarchy', () => {
      const parent = Transform.create({ x: 100, y: 100 }, Math.PI / 2);
      const child = Transform.create({ x: 10, y: 0 }, Math.PI / 4);
      const result = Transform.compose(parent, child);
      
      // Child at (10, 0) local rotated 90° = (0, 10) in parent's frame
      // Then add parent position (100, 100)
      expect(result.position.x).toBeCloseTo(100, 10);
      expect(result.position.y).toBeCloseTo(110, 10);
      expect(result.rotation).toBeCloseTo((3 * Math.PI) / 4, 10);
    });

    it('should be equivalent to chained transformPoint', () => {
      const a = Transform.create({ x: 50, y: 75 }, Math.PI / 6);
      const b = Transform.create({ x: 10, y: 20 }, Math.PI / 3);
      const composed = Transform.compose(a, b);
      
      const testPoint = { x: 5, y: 5 };
      
      // Method 1: Compose then transform
      const result1 = Transform.transformPoint(composed, testPoint);
      
      // Method 2: Transform with b, then with a
      const intermediate = Transform.transformPoint(b, testPoint);
      const result2 = Transform.transformPoint(a, intermediate);
      
      expect(result1.x).toBeCloseTo(result2.x, 10);
      expect(result1.y).toBeCloseTo(result2.y, 10);
    });

    it('should handle identity as second transform', () => {
      const a = Transform.create({ x: 100, y: 50 }, Math.PI / 4);
      const b = Transform.identity();
      const result = Transform.compose(a, b);
      expect(result.position.x).toBeCloseTo(100, 10);
      expect(result.position.y).toBeCloseTo(50, 10);
      expect(result.rotation).toBeCloseTo(Math.PI / 4, 10);
    });

    it('should handle identity as first transform', () => {
      const a = Transform.identity();
      const b = Transform.create({ x: 100, y: 50 }, Math.PI / 4);
      const result = Transform.compose(a, b);
      expect(result.position.x).toBeCloseTo(100, 10);
      expect(result.position.y).toBeCloseTo(50, 10);
      expect(result.rotation).toBeCloseTo(Math.PI / 4, 10);
    });
  });

  describe('inverse', () => {
    it('should invert identity to identity', () => {
      const t = Transform.identity();
      const inv = Transform.inverse(t);
      expect(inv.position.x).toBeCloseTo(0, 10);
      expect(inv.position.y).toBeCloseTo(0, 10);
      expect(inv.rotation).toBeCloseTo(0, 10);
    });

    it('should negate rotation', () => {
      const t = Transform.create({ x: 0, y: 0 }, Math.PI / 4);
      const inv = Transform.inverse(t);
      expect(inv.rotation).toBeCloseTo(-Math.PI / 4, 10);
    });

    it('should invert translation only transform', () => {
      const t = Transform.create({ x: 100, y: 50 }, 0);
      const inv = Transform.inverse(t);
      expect(inv.position.x).toBeCloseTo(-100, 10);
      expect(inv.position.y).toBeCloseTo(-50, 10);
    });

    it('should compose to identity with original', () => {
      const t = Transform.create({ x: 100, y: 50 }, Math.PI / 3);
      const inv = Transform.inverse(t);
      const composed = Transform.compose(t, inv);
      
      expect(composed.position.x).toBeCloseTo(0, 10);
      expect(composed.position.y).toBeCloseTo(0, 10);
      expect(composed.rotation).toBeCloseTo(0, 10);
    });

    it('should make transformPoint equivalent to inverseTransformPoint', () => {
      const t = Transform.create({ x: 100, y: 50 }, Math.PI / 4);
      const inv = Transform.inverse(t);
      const worldPoint = { x: 150, y: 100 };
      
      const result1 = Transform.inverseTransformPoint(t, worldPoint);
      const result2 = Transform.transformPoint(inv, worldPoint);
      
      expect(result1.x).toBeCloseTo(result2.x, 10);
      expect(result1.y).toBeCloseTo(result2.y, 10);
    });

    it('should handle negative positions', () => {
      const t = Transform.create({ x: -100, y: -50 }, Math.PI / 2);
      const inv = Transform.inverse(t);
      const point = { x: 0, y: 0 };
      
      const world = Transform.transformPoint(t, point);
      const backToLocal = Transform.transformPoint(inv, world);
      
      expect(backToLocal.x).toBeCloseTo(0, 10);
      expect(backToLocal.y).toBeCloseTo(0, 10);
    });
  });

  // ============================================================
  // UTILITIES
  // ============================================================

  describe('equals', () => {
    it('should return true for identical transforms', () => {
      const a = Transform.create({ x: 100, y: 50 }, Math.PI / 4);
      const b = Transform.create({ x: 100, y: 50 }, Math.PI / 4);
      expect(Transform.equals(a, b)).toBe(true);
    });

    it('should return false for different positions', () => {
      const a = Transform.create({ x: 100, y: 50 }, 0);
      const b = Transform.create({ x: 101, y: 50 }, 0);
      expect(Transform.equals(a, b)).toBe(false);
    });

    it('should return false for different rotations', () => {
      const a = Transform.create({ x: 100, y: 50 }, 0);
      const b = Transform.create({ x: 100, y: 50 }, 0.1);
      expect(Transform.equals(a, b)).toBe(false);
    });

    it('should handle floating-point precision with default epsilon', () => {
      const a = Transform.create({ x: 100, y: 50 }, Math.PI / 4);
      const b = Transform.create(
        { x: 100 + 1e-11, y: 50 + 1e-11 },
        Math.PI / 4 + 1e-11
      );
      expect(Transform.equals(a, b)).toBe(true);
    });

    it('should use custom epsilon', () => {
      const a = Transform.create({ x: 100, y: 50 }, 0);
      const b = Transform.create({ x: 100.01, y: 50.01 }, 0.01);
      expect(Transform.equals(a, b, 0.1, 0.1)).toBe(true);
      expect(Transform.equals(a, b, 0.001, 0.001)).toBe(false);
    });

    it('should compare identity transforms as equal', () => {
      const a = Transform.identity();
      const b = Transform.identity();
      expect(Transform.equals(a, b)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should convert transform to string', () => {
      const t = Transform.create({ x: 100, y: 50 }, Math.PI / 4);
      const str = Transform.toString(t);
      expect(str).toContain('100');
      expect(str).toContain('50');
      expect(str).toContain((Math.PI / 4).toString());
    });

    it('should handle negative values', () => {
      const t = Transform.create({ x: -100, y: -50 }, -Math.PI);
      const str = Transform.toString(t);
      expect(str).toContain('-100');
      expect(str).toContain('-50');
      expect(str).toContain((-Math.PI).toString());
    });

    it('should handle identity transform', () => {
      const t = Transform.identity();
      const str = Transform.toString(t);
      expect(str).toBeDefined();
      expect(typeof str).toBe('string');
    });
  });
});

