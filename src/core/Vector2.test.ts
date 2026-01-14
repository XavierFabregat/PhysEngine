import { describe, it, expect } from 'vitest';
import * as Vec2 from './Vector2';

describe('Vector2', () => {
  // ============================================================
  // CREATION & BASIC OPERATIONS
  // ============================================================

  describe('create', () => {
    it('should create a vector with given components', () => {
      const v = Vec2.create(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });

    it('should handle negative values', () => {
      const v = Vec2.create(-5, -10);
      expect(v.x).toBe(-5);
      expect(v.y).toBe(-10);
    });

    it('should handle floating-point values', () => {
      const v = Vec2.create(3.14, 2.71);
      expect(v.x).toBe(3.14);
      expect(v.y).toBe(2.71);
    });

    it('should handle zero values', () => {
      const v = Vec2.create(0, 0);
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('zero', () => {
    it('should create a zero vector', () => {
      const v = Vec2.zero();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('clone', () => {
    it('should create a copy of a vector', () => {
      const original = Vec2.create(5, 7);
      const copy = Vec2.clone(original);
      expect(copy.x).toBe(5);
      expect(copy.y).toBe(7);
    });

    it('should create a new instance (not reference)', () => {
      const original = Vec2.create(5, 7);
      const copy = Vec2.clone(original);
      expect(copy).not.toBe(original);
    });
  });

  describe('add', () => {
    it('should add two vectors component-wise', () => {
      const a = Vec2.create(3, 4);
      const b = Vec2.create(1, 2);
      const result = Vec2.add(a, b);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('should handle negative values', () => {
      const a = Vec2.create(5, 10);
      const b = Vec2.create(-2, -3);
      const result = Vec2.add(a, b);
      expect(result.x).toBe(3);
      expect(result.y).toBe(7);
    });

    it('should not modify original vectors', () => {
      const a = Vec2.create(1, 2);
      const b = Vec2.create(3, 4);
      Vec2.add(a, b);
      expect(a.x).toBe(1);
      expect(a.y).toBe(2);
      expect(b.x).toBe(3);
      expect(b.y).toBe(4);
    });
  });

  describe('sub', () => {
    it('should subtract two vectors component-wise', () => {
      const a = Vec2.create(5, 8);
      const b = Vec2.create(2, 3);
      const result = Vec2.sub(a, b);
      expect(result.x).toBe(3);
      expect(result.y).toBe(5);
    });

    it('should handle negative results', () => {
      const a = Vec2.create(2, 3);
      const b = Vec2.create(5, 8);
      const result = Vec2.sub(a, b);
      expect(result.x).toBe(-3);
      expect(result.y).toBe(-5);
    });

    it('should not modify original vectors', () => {
      const a = Vec2.create(5, 8);
      const b = Vec2.create(2, 3);
      Vec2.sub(a, b);
      expect(a.x).toBe(5);
      expect(a.y).toBe(8);
    });
  });

  describe('scale', () => {
    it('should multiply vector by scalar', () => {
      const v = Vec2.create(3, 4);
      const result = Vec2.scale(v, 2);
      expect(result.x).toBe(6);
      expect(result.y).toBe(8);
    });

    it('should handle negative scalars', () => {
      const v = Vec2.create(3, 4);
      const result = Vec2.scale(v, -2);
      expect(result.x).toBe(-6);
      expect(result.y).toBe(-8);
    });

    it('should handle fractional scalars', () => {
      const v = Vec2.create(10, 20);
      const result = Vec2.scale(v, 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });

    it('should handle zero scalar', () => {
      const v = Vec2.create(5, 7);
      const result = Vec2.scale(v, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('negate', () => {
    it('should reverse the direction of a vector', () => {
      const v = Vec2.create(3, 4);
      const result = Vec2.negate(v);
      expect(result.x).toBe(-3);
      expect(result.y).toBe(-4);
    });

    it('should handle negative input', () => {
      const v = Vec2.create(-5, -7);
      const result = Vec2.negate(v);
      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
    });

    it('should handle zero vector', () => {
      const v = Vec2.zero();
      const result = Vec2.negate(v);
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });
  });

  // ============================================================
  // VECTOR PRODUCTS
  // ============================================================

  describe('dot', () => {
    it('should compute dot product of two vectors', () => {
      const a = Vec2.create(3, 4);
      const b = Vec2.create(2, 1);
      const result = Vec2.dot(a, b);
      expect(result).toBe(10); // 3*2 + 4*1 = 10
    });

    it('should return zero for perpendicular vectors', () => {
      const a = Vec2.create(1, 0);
      const b = Vec2.create(0, 1);
      const result = Vec2.dot(a, b);
      expect(result).toBe(0);
    });

    it('should return negative for obtuse angles', () => {
      const a = Vec2.create(1, 0);
      const b = Vec2.create(-1, 0);
      const result = Vec2.dot(a, b);
      expect(result).toBe(-1);
    });

    it('should handle zero vectors', () => {
      const a = Vec2.create(5, 3);
      const b = Vec2.zero();
      const result = Vec2.dot(a, b);
      expect(result).toBe(0);
    });
  });

  describe('cross', () => {
    it('should compute 2D cross product', () => {
      const a = Vec2.create(3, 4);
      const b = Vec2.create(2, 1);
      const result = Vec2.cross(a, b);
      expect(result).toBe(-5); // 3*1 - 4*2 = -5
    });

    it('should return positive for counter-clockwise vectors', () => {
      const a = Vec2.create(1, 0);
      const b = Vec2.create(0, 1);
      const result = Vec2.cross(a, b);
      expect(result).toBe(1);
    });

    it('should return negative for clockwise vectors', () => {
      const a = Vec2.create(0, 1);
      const b = Vec2.create(1, 0);
      const result = Vec2.cross(a, b);
      expect(result).toBe(-1);
    });

    it('should return zero for parallel vectors', () => {
      const a = Vec2.create(2, 4);
      const b = Vec2.create(1, 2);
      const result = Vec2.cross(a, b);
      expect(result).toBe(0);
    });
  });

  // ============================================================
  // MAGNITUDE OPERATIONS
  // ============================================================

  describe('lengthSq', () => {
    it('should compute squared length', () => {
      const v = Vec2.create(3, 4);
      const result = Vec2.lengthSq(v);
      expect(result).toBe(25); // 3² + 4² = 25
    });

    it('should return zero for zero vector', () => {
      const v = Vec2.zero();
      const result = Vec2.lengthSq(v);
      expect(result).toBe(0);
    });

    it('should handle unit vectors', () => {
      const v = Vec2.create(1, 0);
      const result = Vec2.lengthSq(v);
      expect(result).toBe(1);
    });
  });

  describe('length', () => {
    it('should compute length using Pythagorean theorem', () => {
      const v = Vec2.create(3, 4);
      const result = Vec2.length(v);
      expect(result).toBe(5);
    });

    it('should return zero for zero vector', () => {
      const v = Vec2.zero();
      const result = Vec2.length(v);
      expect(result).toBe(0);
    });

    it('should return 1 for unit vectors', () => {
      const v = Vec2.create(1, 0);
      const result = Vec2.length(v);
      expect(result).toBe(1);
    });

    it('should handle fractional lengths', () => {
      const v = Vec2.create(1, 1);
      const result = Vec2.length(v);
      expect(result).toBeCloseTo(Math.sqrt(2), 10);
    });
  });

  describe('distanceSq', () => {
    it('should compute squared distance between points', () => {
      const a = Vec2.create(1, 2);
      const b = Vec2.create(4, 6);
      const result = Vec2.distanceSq(a, b);
      expect(result).toBe(25); // (4-1)² + (6-2)² = 9 + 16 = 25
    });

    it('should return zero for same point', () => {
      const a = Vec2.create(5, 7);
      const b = Vec2.create(5, 7);
      const result = Vec2.distanceSq(a, b);
      expect(result).toBe(0);
    });
  });

  describe('distance', () => {
    it('should compute Euclidean distance between points', () => {
      const a = Vec2.create(1, 2);
      const b = Vec2.create(4, 6);
      const result = Vec2.distance(a, b);
      expect(result).toBe(5);
    });

    it('should return zero for same point', () => {
      const a = Vec2.create(5, 7);
      const b = Vec2.create(5, 7);
      const result = Vec2.distance(a, b);
      expect(result).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const a = Vec2.create(-1, -1);
      const b = Vec2.create(2, 3);
      const result = Vec2.distance(a, b);
      expect(result).toBe(5);
    });
  });

  describe('normalize', () => {
    it('should create unit vector in same direction', () => {
      const v = Vec2.create(3, 4);
      const result = Vec2.normalize(v);
      expect(result.x).toBeCloseTo(0.6, 10);
      expect(result.y).toBeCloseTo(0.8, 10);
      expect(Vec2.length(result)).toBeCloseTo(1, 10);
    });

    it('should return zero vector for zero input', () => {
      const v = Vec2.zero();
      const result = Vec2.normalize(v);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should not change unit vectors', () => {
      const v = Vec2.create(1, 0);
      const result = Vec2.normalize(v);
      expect(result.x).toBeCloseTo(1, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });

    it('should handle negative components', () => {
      const v = Vec2.create(-3, -4);
      const result = Vec2.normalize(v);
      expect(result.x).toBeCloseTo(-0.6, 10);
      expect(result.y).toBeCloseTo(-0.8, 10);
      expect(Vec2.length(result)).toBeCloseTo(1, 10);
    });
  });

  // ============================================================
  // TRANSFORMATIONS
  // ============================================================

  describe('rotate', () => {
    it('should rotate vector by 90 degrees counter-clockwise', () => {
      const v = Vec2.create(1, 0);
      const result = Vec2.rotate(v, Math.PI / 2);
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(1, 10);
    });

    it('should rotate vector by 180 degrees', () => {
      const v = Vec2.create(1, 0);
      const result = Vec2.rotate(v, Math.PI);
      expect(result.x).toBeCloseTo(-1, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });

    it('should rotate vector by 270 degrees', () => {
      const v = Vec2.create(1, 0);
      const result = Vec2.rotate(v, (3 * Math.PI) / 2);
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(-1, 10);
    });

    it('should handle zero rotation', () => {
      const v = Vec2.create(3, 4);
      const result = Vec2.rotate(v, 0);
      expect(result.x).toBeCloseTo(3, 10);
      expect(result.y).toBeCloseTo(4, 10);
    });

    it('should handle negative angles (clockwise)', () => {
      const v = Vec2.create(1, 0);
      const result = Vec2.rotate(v, -Math.PI / 2);
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(-1, 10);
    });

    it('should preserve length after rotation', () => {
      const v = Vec2.create(3, 4);
      const originalLength = Vec2.length(v);
      const result = Vec2.rotate(v, Math.PI / 3);
      const newLength = Vec2.length(result);
      expect(newLength).toBeCloseTo(originalLength, 10);
    });
  });

  describe('perpendicular', () => {
    it('should create perpendicular vector (90° counter-clockwise)', () => {
      const v = Vec2.create(3, 4);
      const result = Vec2.perpendicular(v);
      expect(result.x).toBe(-4);
      expect(result.y).toBe(3);
    });

    it('should be perpendicular to original (dot product = 0)', () => {
      const v = Vec2.create(3, 4);
      const perp = Vec2.perpendicular(v);
      const dotProduct = Vec2.dot(v, perp);
      expect(dotProduct).toBe(0);
    });

    it('should preserve length', () => {
      const v = Vec2.create(3, 4);
      const perp = Vec2.perpendicular(v);
      expect(Vec2.length(perp)).toBe(Vec2.length(v));
    });

    it('should handle zero vector', () => {
      const v = Vec2.zero();
      const result = Vec2.perpendicular(v);
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });
  });

  // ============================================================
  // INTERPOLATION
  // ============================================================

  describe('lerp', () => {
    it('should return start vector when t = 0', () => {
      const a = Vec2.create(0, 0);
      const b = Vec2.create(10, 10);
      const result = Vec2.lerp(a, b, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should return end vector when t = 1', () => {
      const a = Vec2.create(0, 0);
      const b = Vec2.create(10, 10);
      const result = Vec2.lerp(a, b, 1);
      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
    });

    it('should return midpoint when t = 0.5', () => {
      const a = Vec2.create(0, 0);
      const b = Vec2.create(10, 10);
      const result = Vec2.lerp(a, b, 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
    });

    it('should interpolate at arbitrary t', () => {
      const a = Vec2.create(0, 0);
      const b = Vec2.create(100, 50);
      const result = Vec2.lerp(a, b, 0.25);
      expect(result.x).toBe(25);
      expect(result.y).toBe(12.5);
    });

    it('should handle negative components', () => {
      const a = Vec2.create(-10, -10);
      const b = Vec2.create(10, 10);
      const result = Vec2.lerp(a, b, 0.5);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should allow extrapolation with t > 1', () => {
      const a = Vec2.create(0, 0);
      const b = Vec2.create(10, 10);
      const result = Vec2.lerp(a, b, 2);
      expect(result.x).toBe(20);
      expect(result.y).toBe(20);
    });

    it('should allow extrapolation with t < 0', () => {
      const a = Vec2.create(0, 0);
      const b = Vec2.create(10, 10);
      const result = Vec2.lerp(a, b, -1);
      expect(result.x).toBe(-10);
      expect(result.y).toBe(-10);
    });
  });

  // ============================================================
  // PROJECTIONS & REFLECTIONS
  // ============================================================

  describe('project', () => {
    it('should project vector onto another', () => {
      const a = Vec2.create(3, 4);
      const b = Vec2.create(1, 0);
      const result = Vec2.project(a, b);
      expect(result.x).toBe(3);
      expect(result.y).toBe(0);
    });

    it('should return zero vector when projecting onto zero vector', () => {
      const a = Vec2.create(3, 4);
      const b = Vec2.zero();
      const result = Vec2.project(a, b);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle perpendicular vectors', () => {
      const a = Vec2.create(0, 5);
      const b = Vec2.create(1, 0);
      const result = Vec2.project(a, b);
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });

    it('should project correctly onto non-unit vectors', () => {
      const a = Vec2.create(4, 2);
      const b = Vec2.create(2, 2);
      const result = Vec2.project(a, b);
      // dot(a,b) = 12, lengthSq(b) = 8, scalar = 1.5
      expect(result.x).toBeCloseTo(3, 10);
      expect(result.y).toBeCloseTo(3, 10);
    });
  });

  describe('reflect', () => {
    it('should reflect vector across horizontal normal', () => {
      const v = Vec2.create(1, -1);
      const normal = Vec2.create(0, 1);
      const result = Vec2.reflect(v, normal);
      expect(result.x).toBeCloseTo(1, 10);
      expect(result.y).toBeCloseTo(1, 10);
    });

    it('should reflect vector across vertical normal', () => {
      const v = Vec2.create(1, 1);
      const normal = Vec2.create(1, 0);
      const result = Vec2.reflect(v, normal);
      expect(result.x).toBeCloseTo(-1, 10);
      expect(result.y).toBeCloseTo(1, 10);
    });

    it('should preserve length after reflection', () => {
      const v = Vec2.create(3, 4);
      const normal = Vec2.normalize(Vec2.create(1, 1));
      const result = Vec2.reflect(v, normal);
      expect(Vec2.length(result)).toBeCloseTo(Vec2.length(v), 10);
    });

    it('should reflect back along normal when parallel', () => {
      const v = Vec2.create(0, 1);
      const normal = Vec2.create(0, 1);
      const result = Vec2.reflect(v, normal);
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(-1, 10);
    });
  });

  // ============================================================
  // UTILITIES
  // ============================================================

  describe('equals', () => {
    it('should return true for identical vectors', () => {
      const a = Vec2.create(3, 4);
      const b = Vec2.create(3, 4);
      expect(Vec2.equals(a, b)).toBe(true);
    });

    it('should return false for different vectors', () => {
      const a = Vec2.create(3, 4);
      const b = Vec2.create(3, 5);
      expect(Vec2.equals(a, b)).toBe(false);
    });

    it('should handle floating-point precision with default epsilon', () => {
      const a = Vec2.create(1.0, 2.0);
      const b = Vec2.create(1.0 + 1e-11, 2.0);
      expect(Vec2.equals(a, b)).toBe(true);
    });

    it('should use custom epsilon', () => {
      const a = Vec2.create(1.0, 2.0);
      const b = Vec2.create(1.01, 2.0);
      expect(Vec2.equals(a, b, 0.1)).toBe(true);
      expect(Vec2.equals(a, b, 0.001)).toBe(false);
    });

    it('should handle zero vectors', () => {
      const a = Vec2.zero();
      const b = Vec2.zero();
      expect(Vec2.equals(a, b)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should convert vector to string', () => {
      const v = Vec2.create(3, 4);
      const result = Vec2.toString(v);
      expect(result).toBe('(3, 4)');
    });

    it('should handle negative values', () => {
      const v = Vec2.create(-5, -7);
      const result = Vec2.toString(v);
      expect(result).toBe('(-5, -7)');
    });

    it('should handle floating-point values', () => {
      const v = Vec2.create(3.14, 2.71);
      const result = Vec2.toString(v);
      expect(result).toBe('(3.14, 2.71)');
    });

    it('should handle zero vector', () => {
      const v = Vec2.zero();
      const result = Vec2.toString(v);
      expect(result).toBe('(0, 0)');
    });
  });

  // ============================================================
  // CONSTANTS
  // ============================================================

  describe('constants', () => {
    it('should have correct ZERO constant', () => {
      expect(Vec2.ZERO.x).toBe(0);
      expect(Vec2.ZERO.y).toBe(0);
    });

    it('should have correct ONE constant', () => {
      expect(Vec2.ONE.x).toBe(1);
      expect(Vec2.ONE.y).toBe(1);
    });

    it('should have correct UP constant', () => {
      expect(Vec2.UP.x).toBe(0);
      expect(Vec2.UP.y).toBe(-1);
    });

    it('should have correct DOWN constant', () => {
      expect(Vec2.DOWN.x).toBe(0);
      expect(Vec2.DOWN.y).toBe(1);
    });

    it('should have correct LEFT constant', () => {
      expect(Vec2.LEFT.x).toBe(-1);
      expect(Vec2.LEFT.y).toBe(0);
    });

    it('should have correct RIGHT constant', () => {
      expect(Vec2.RIGHT.x).toBe(1);
      expect(Vec2.RIGHT.y).toBe(0);
    });
  });
});

