import { describe, it, expect } from 'vitest';
import * as AABB from './AABB';

describe('AABB', () => {
  // ============================================================
  // CREATION
  // ============================================================

  describe('create', () => {
    it('should create an AABB with given min and max', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 100, y: 50 });
      expect(aabb.min.x).toBe(0);
      expect(aabb.min.y).toBe(0);
      expect(aabb.max.x).toBe(100);
      expect(aabb.max.y).toBe(50);
    });

    it('should handle negative coordinates', () => {
      const aabb = AABB.create({ x: -50, y: -100 }, { x: 50, y: 100 });
      expect(aabb.min.x).toBe(-50);
      expect(aabb.min.y).toBe(-100);
      expect(aabb.max.x).toBe(50);
      expect(aabb.max.y).toBe(100);
    });

    it('should handle point AABB (min === max)', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 10, y: 20 });
      expect(aabb.min.x).toBe(10);
      expect(aabb.max.x).toBe(10);
    });
  });

  describe('fromCenter', () => {
    it('should create AABB from center and half-extents', () => {
      const aabb = AABB.fromCenter({ x: 50, y: 50 }, { x: 25, y: 25 });
      expect(aabb.min.x).toBe(25);
      expect(aabb.min.y).toBe(25);
      expect(aabb.max.x).toBe(75);
      expect(aabb.max.y).toBe(75);
    });

    it('should handle zero half-extents', () => {
      const aabb = AABB.fromCenter({ x: 10, y: 20 }, { x: 0, y: 0 });
      expect(aabb.min.x).toBe(10);
      expect(aabb.min.y).toBe(20);
      expect(aabb.max.x).toBe(10);
      expect(aabb.max.y).toBe(20);
    });

    it('should handle asymmetric half-extents', () => {
      const aabb = AABB.fromCenter({ x: 0, y: 0 }, { x: 100, y: 50 });
      expect(aabb.min.x).toBe(-100);
      expect(aabb.min.y).toBe(-50);
      expect(aabb.max.x).toBe(100);
      expect(aabb.max.y).toBe(50);
    });
  });

  describe('fromPoints', () => {
    it('should create AABB containing all points', () => {
      const points = [
        { x: 10, y: 20 },
        { x: 50, y: 60 },
        { x: 30, y: 40 },
      ];
      const aabb = AABB.fromPoints(points);
      expect(aabb.min.x).toBe(10);
      expect(aabb.min.y).toBe(20);
      expect(aabb.max.x).toBe(50);
      expect(aabb.max.y).toBe(60);
    });

    it('should handle single point', () => {
      const points = [{ x: 15, y: 25 }];
      const aabb = AABB.fromPoints(points);
      expect(aabb.min.x).toBe(15);
      expect(aabb.min.y).toBe(25);
      expect(aabb.max.x).toBe(15);
      expect(aabb.max.y).toBe(25);
    });

    it('should handle negative points', () => {
      const points = [
        { x: -10, y: -20 },
        { x: -50, y: -60 },
        { x: 10, y: 20 },
      ];
      const aabb = AABB.fromPoints(points);
      expect(aabb.min.x).toBe(-50);
      expect(aabb.min.y).toBe(-60);
      expect(aabb.max.x).toBe(10);
      expect(aabb.max.y).toBe(20);
    });

    it('should throw error for empty array', () => {
      expect(() => AABB.fromPoints([])).toThrow();
    });
  });

  describe('clone', () => {
    it('should create a copy of AABB', () => {
      const original = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const copy = AABB.clone(original);
      expect(copy.min.x).toBe(10);
      expect(copy.min.y).toBe(20);
      expect(copy.max.x).toBe(30);
      expect(copy.max.y).toBe(40);
    });

    it('should create new instance (not reference)', () => {
      const original = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const copy = AABB.clone(original);
      expect(copy).not.toBe(original);
      expect(copy.min).not.toBe(original.min);
      expect(copy.max).not.toBe(original.max);
    });
  });

  // ============================================================
  // COLLISION DETECTION
  // ============================================================

  describe('overlaps', () => {
    it('should return true for overlapping AABBs', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const b = AABB.create({ x: 25, y: 25 }, { x: 75, y: 75 });
      expect(AABB.overlaps(a, b)).toBe(true);
      expect(AABB.overlaps(b, a)).toBe(true);
    });

    it('should return true for touching AABBs (edges)', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const b = AABB.create({ x: 50, y: 0 }, { x: 100, y: 50 });
      expect(AABB.overlaps(a, b)).toBe(true);
    });

    it('should return false for separated AABBs on X axis', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const b = AABB.create({ x: 60, y: 0 }, { x: 100, y: 50 });
      expect(AABB.overlaps(a, b)).toBe(false);
    });

    it('should return false for separated AABBs on Y axis', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const b = AABB.create({ x: 0, y: 60 }, { x: 50, y: 100 });
      expect(AABB.overlaps(a, b)).toBe(false);
    });

    it('should return true for identical AABBs', () => {
      const a = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const b = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      expect(AABB.overlaps(a, b)).toBe(true);
    });

    it('should return true when one AABB contains another', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 100, y: 100 });
      const b = AABB.create({ x: 25, y: 25 }, { x: 75, y: 75 });
      expect(AABB.overlaps(a, b)).toBe(true);
      expect(AABB.overlaps(b, a)).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const a = AABB.create({ x: -50, y: -50 }, { x: 0, y: 0 });
      const b = AABB.create({ x: -25, y: -25 }, { x: 25, y: 25 });
      expect(AABB.overlaps(a, b)).toBe(true);
    });
  });

  describe('contains', () => {
    it('should return true for point inside AABB', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 100, y: 100 });
      expect(AABB.contains(aabb, { x: 50, y: 50 })).toBe(true);
    });

    it('should return true for point on boundary', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 100, y: 100 });
      expect(AABB.contains(aabb, { x: 0, y: 0 })).toBe(true);
      expect(AABB.contains(aabb, { x: 100, y: 100 })).toBe(true);
      expect(AABB.contains(aabb, { x: 50, y: 0 })).toBe(true);
      expect(AABB.contains(aabb, { x: 0, y: 50 })).toBe(true);
    });

    it('should return false for point outside AABB', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 100, y: 100 });
      expect(AABB.contains(aabb, { x: -10, y: 50 })).toBe(false);
      expect(AABB.contains(aabb, { x: 110, y: 50 })).toBe(false);
      expect(AABB.contains(aabb, { x: 50, y: -10 })).toBe(false);
      expect(AABB.contains(aabb, { x: 50, y: 110 })).toBe(false);
    });

    it('should handle negative coordinates', () => {
      const aabb = AABB.create({ x: -50, y: -50 }, { x: 50, y: 50 });
      expect(AABB.contains(aabb, { x: 0, y: 0 })).toBe(true);
      expect(AABB.contains(aabb, { x: -25, y: -25 })).toBe(true);
      expect(AABB.contains(aabb, { x: -60, y: 0 })).toBe(false);
    });
  });

  describe('containsAABB', () => {
    it('should return true when A contains B', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 100, y: 100 });
      const b = AABB.create({ x: 25, y: 25 }, { x: 75, y: 75 });
      expect(AABB.containsAABB(a, b)).toBe(true);
    });

    it('should return false when B contains A', () => {
      const a = AABB.create({ x: 25, y: 25 }, { x: 75, y: 75 });
      const b = AABB.create({ x: 0, y: 0 }, { x: 100, y: 100 });
      expect(AABB.containsAABB(a, b)).toBe(false);
    });

    it('should return true for identical AABBs', () => {
      const a = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const b = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      expect(AABB.containsAABB(a, b)).toBe(true);
    });

    it('should return false for partially overlapping AABBs', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const b = AABB.create({ x: 25, y: 25 }, { x: 75, y: 75 });
      expect(AABB.containsAABB(a, b)).toBe(false);
    });

    it('should return false for non-overlapping AABBs', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const b = AABB.create({ x: 60, y: 60 }, { x: 100, y: 100 });
      expect(AABB.containsAABB(a, b)).toBe(false);
    });
  });

  // ============================================================
  // QUERIES
  // ============================================================

  describe('area', () => {
    it('should compute area of AABB', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 50, y: 100 });
      expect(AABB.area(aabb)).toBe(5000);
    });

    it('should return 0 for point AABB', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 10, y: 20 });
      expect(AABB.area(aabb)).toBe(0);
    });

    it('should handle square AABB', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      expect(AABB.area(aabb)).toBe(2500);
    });

    it('should work with negative coordinates', () => {
      const aabb = AABB.create({ x: -50, y: -100 }, { x: 50, y: 100 });
      expect(AABB.area(aabb)).toBe(20000);
    });
  });

  describe('perimeter', () => {
    it('should compute perimeter of AABB', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 50, y: 100 });
      expect(AABB.perimeter(aabb)).toBe(300); // 2 * (50 + 100)
    });

    it('should return 0 for point AABB', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 10, y: 20 });
      expect(AABB.perimeter(aabb)).toBe(0);
    });

    it('should handle square AABB', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      expect(AABB.perimeter(aabb)).toBe(200); // 2 * (50 + 50)
    });
  });

  describe('center', () => {
    it('should compute center of AABB', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 100, y: 50 });
      const c = AABB.center(aabb);
      expect(c.x).toBe(50);
      expect(c.y).toBe(25);
    });

    it('should handle AABB centered at origin', () => {
      const aabb = AABB.create({ x: -50, y: -50 }, { x: 50, y: 50 });
      const c = AABB.center(aabb);
      expect(c.x).toBe(0);
      expect(c.y).toBe(0);
    });

    it('should handle point AABB', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 10, y: 20 });
      const c = AABB.center(aabb);
      expect(c.x).toBe(10);
      expect(c.y).toBe(20);
    });

    it('should handle negative coordinates', () => {
      const aabb = AABB.create({ x: -100, y: -50 }, { x: 0, y: 50 });
      const c = AABB.center(aabb);
      expect(c.x).toBe(-50);
      expect(c.y).toBe(0);
    });
  });

  describe('halfExtents', () => {
    it('should compute half-extents of AABB', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 100, y: 50 });
      const he = AABB.halfExtents(aabb);
      expect(he.x).toBe(50);
      expect(he.y).toBe(25);
    });

    it('should return zero for point AABB', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 10, y: 20 });
      const he = AABB.halfExtents(aabb);
      expect(he.x).toBe(0);
      expect(he.y).toBe(0);
    });

    it('should handle AABB at origin', () => {
      const aabb = AABB.create({ x: -50, y: -25 }, { x: 50, y: 25 });
      const he = AABB.halfExtents(aabb);
      expect(he.x).toBe(50);
      expect(he.y).toBe(25);
    });
  });

  describe('width', () => {
    it('should compute width of AABB', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 50, y: 100 });
      expect(AABB.width(aabb)).toBe(40);
    });

    it('should return 0 for point AABB', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 10, y: 30 });
      expect(AABB.width(aabb)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const aabb = AABB.create({ x: -50, y: 0 }, { x: 50, y: 100 });
      expect(AABB.width(aabb)).toBe(100);
    });
  });

  describe('height', () => {
    it('should compute height of AABB', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 50, y: 100 });
      expect(AABB.height(aabb)).toBe(80);
    });

    it('should return 0 for point AABB', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 50, y: 20 });
      expect(AABB.height(aabb)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const aabb = AABB.create({ x: 0, y: -50 }, { x: 100, y: 50 });
      expect(AABB.height(aabb)).toBe(100);
    });
  });

  // ============================================================
  // OPERATIONS
  // ============================================================

  describe('merge', () => {
    it('should merge two non-overlapping AABBs', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const b = AABB.create({ x: 60, y: 60 }, { x: 100, y: 100 });
      const merged = AABB.merge(a, b);
      expect(merged.min.x).toBe(0);
      expect(merged.min.y).toBe(0);
      expect(merged.max.x).toBe(100);
      expect(merged.max.y).toBe(100);
    });

    it('should merge two overlapping AABBs', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 60, y: 60 });
      const b = AABB.create({ x: 40, y: 40 }, { x: 100, y: 100 });
      const merged = AABB.merge(a, b);
      expect(merged.min.x).toBe(0);
      expect(merged.min.y).toBe(0);
      expect(merged.max.x).toBe(100);
      expect(merged.max.y).toBe(100);
    });

    it('should handle one AABB containing another', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 100, y: 100 });
      const b = AABB.create({ x: 25, y: 25 }, { x: 75, y: 75 });
      const merged = AABB.merge(a, b);
      expect(merged.min.x).toBe(0);
      expect(merged.min.y).toBe(0);
      expect(merged.max.x).toBe(100);
      expect(merged.max.y).toBe(100);
    });

    it('should handle negative coordinates', () => {
      const a = AABB.create({ x: -50, y: -50 }, { x: 0, y: 0 });
      const b = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const merged = AABB.merge(a, b);
      expect(merged.min.x).toBe(-50);
      expect(merged.min.y).toBe(-50);
      expect(merged.max.x).toBe(50);
      expect(merged.max.y).toBe(50);
    });

    it('should be commutative', () => {
      const a = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const b = AABB.create({ x: 60, y: 60 }, { x: 100, y: 100 });
      const mergedAB = AABB.merge(a, b);
      const mergedBA = AABB.merge(b, a);
      expect(AABB.equals(mergedAB, mergedBA)).toBe(true);
    });
  });

  describe('expand', () => {
    it('should expand AABB by positive margin', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const expanded = AABB.expand(aabb, 5);
      expect(expanded.min.x).toBe(5);
      expect(expanded.min.y).toBe(15);
      expect(expanded.max.x).toBe(35);
      expect(expanded.max.y).toBe(45);
    });

    it('should shrink AABB with negative margin', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 100, y: 100 });
      const shrunk = AABB.expand(aabb, -10);
      expect(shrunk.min.x).toBe(10);
      expect(shrunk.min.y).toBe(10);
      expect(shrunk.max.x).toBe(90);
      expect(shrunk.max.y).toBe(90);
    });

    it('should do nothing with zero margin', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const expanded = AABB.expand(aabb, 0);
      expect(AABB.equals(aabb, expanded)).toBe(true);
    });

    it('should handle point AABB', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 10, y: 20 });
      const expanded = AABB.expand(aabb, 5);
      expect(expanded.min.x).toBe(5);
      expect(expanded.min.y).toBe(15);
      expect(expanded.max.x).toBe(15);
      expect(expanded.max.y).toBe(25);
    });
  });

  describe('translate', () => {
    it('should translate AABB by positive offset', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 50, y: 50 });
      const translated = AABB.translate(aabb, { x: 10, y: 20 });
      expect(translated.min.x).toBe(10);
      expect(translated.min.y).toBe(20);
      expect(translated.max.x).toBe(60);
      expect(translated.max.y).toBe(70);
    });

    it('should translate AABB by negative offset', () => {
      const aabb = AABB.create({ x: 50, y: 50 }, { x: 100, y: 100 });
      const translated = AABB.translate(aabb, { x: -25, y: -25 });
      expect(translated.min.x).toBe(25);
      expect(translated.min.y).toBe(25);
      expect(translated.max.x).toBe(75);
      expect(translated.max.y).toBe(75);
    });

    it('should preserve size after translation', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 50, y: 100 });
      const translated = AABB.translate(aabb, { x: 100, y: 200 });
      expect(AABB.width(translated)).toBe(AABB.width(aabb));
      expect(AABB.height(translated)).toBe(AABB.height(aabb));
    });

    it('should do nothing with zero offset', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const translated = AABB.translate(aabb, { x: 0, y: 0 });
      expect(AABB.equals(aabb, translated)).toBe(true);
    });
  });

  // ============================================================
  // UTILITIES
  // ============================================================

  describe('equals', () => {
    it('should return true for identical AABBs', () => {
      const a = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const b = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      expect(AABB.equals(a, b)).toBe(true);
    });

    it('should return false for different AABBs', () => {
      const a = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const b = AABB.create({ x: 11, y: 20 }, { x: 30, y: 40 });
      expect(AABB.equals(a, b)).toBe(false);
    });

    it('should handle floating-point precision with default epsilon', () => {
      const a = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const b = AABB.create(
        { x: 10 + 1e-11, y: 20 + 1e-11 },
        { x: 30 + 1e-11, y: 40 + 1e-11 }
      );
      expect(AABB.equals(a, b)).toBe(true);
    });

    it('should use custom epsilon', () => {
      const a = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const b = AABB.create({ x: 10.01, y: 20.01 }, { x: 30.01, y: 40.01 });
      expect(AABB.equals(a, b, 0.1)).toBe(true);
      expect(AABB.equals(a, b, 0.001)).toBe(false);
    });
  });

  describe('isValid', () => {
    it('should return true for valid AABB', () => {
      const aabb = AABB.create({ x: 0, y: 0 }, { x: 100, y: 100 });
      expect(AABB.isValid(aabb)).toBe(true);
    });

    it('should return true for point AABB (min === max)', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 10, y: 20 });
      expect(AABB.isValid(aabb)).toBe(true);
    });

    it('should return false when min.x > max.x', () => {
      const aabb = AABB.create({ x: 100, y: 0 }, { x: 0, y: 100 });
      expect(AABB.isValid(aabb)).toBe(false);
    });

    it('should return false when min.y > max.y', () => {
      const aabb = AABB.create({ x: 0, y: 100 }, { x: 100, y: 0 });
      expect(AABB.isValid(aabb)).toBe(false);
    });

    it('should handle negative coordinates', () => {
      const aabb = AABB.create({ x: -100, y: -100 }, { x: 0, y: 0 });
      expect(AABB.isValid(aabb)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should convert AABB to string', () => {
      const aabb = AABB.create({ x: 10, y: 20 }, { x: 30, y: 40 });
      const str = AABB.toString(aabb);
      expect(str).toContain('10');
      expect(str).toContain('20');
      expect(str).toContain('30');
      expect(str).toContain('40');
    });

    it('should handle negative values', () => {
      const aabb = AABB.create({ x: -50, y: -100 }, { x: 50, y: 100 });
      const str = AABB.toString(aabb);
      expect(str).toContain('-50');
      expect(str).toContain('-100');
    });

    it('should handle point AABB', () => {
      const aabb = AABB.create({ x: 5, y: 10 }, { x: 5, y: 10 });
      const str = AABB.toString(aabb);
      expect(str).toBeDefined();
      expect(typeof str).toBe('string');
    });
  });
});

