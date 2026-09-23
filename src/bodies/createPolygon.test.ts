import { describe, it, expect, beforeEach } from 'vitest';
import { createPolygon } from './createPolygon';
import { resetBodyIdCounter } from './idGenerator';
import { calculatePolygonArea } from './utils';
import { BodyType } from '../types/BodyType';
import { DEFAULT_MATERIAL } from '../types/Material';

const square = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 20 },
  { x: 0, y: 20 },
];

describe('createPolygon', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('centering and winding', () => {
    it('should re-center the body on the centroid, keeping the shape in place', () => {
      const body = createPolygon({ position: { x: 100, y: 50 }, vertices: square });

      // Square spans (100..120, 50..70): centroid (110, 60)
      expect(body.position).toEqual({ x: 110, y: 60 });
      if (body.shape.type !== 'polygon') throw new Error('expected polygon');
      expect(body.shape.vertices).toEqual([
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: 10 },
        { x: -10, y: 10 },
      ]);
      expect(body.aabb).toEqual({ min: { x: 100, y: 50 }, max: { x: 120, y: 70 } });
    });

    it('should normalize reversed winding to positive signed area', () => {
      const body = createPolygon({ vertices: [...square].reverse() });
      if (body.shape.type !== 'polygon') throw new Error('expected polygon');

      expect(calculatePolygonArea(body.shape.vertices)).toBeGreaterThan(0);
    });

    it('should not alias the caller vertices or vectors', () => {
      const vertices = square.map((v) => ({ ...v }));
      const position = { x: 1, y: 2 };
      const body = createPolygon({ vertices, position });

      vertices[0]!.x = 999;
      position.x = 999;

      if (body.shape.type !== 'polygon') throw new Error('expected polygon');
      expect(body.shape.vertices[0]!.x).toBe(-10);
      expect(body.position.x).toBe(11);
    });
  });

  describe('mass properties', () => {
    it('should compute mass from area and density', () => {
      const body = createPolygon({ vertices: square, material: { density: 2 } });
      expect(body.mass).toBeCloseTo(400 * 2, 10);
      expect(body.invMass).toBeCloseTo(1 / 800, 12);
    });

    it('should match the rectangle inertia formula for a square', () => {
      const body = createPolygon({ vertices: square });
      const mass = 400 * DEFAULT_MATERIAL.density;
      expect(body.inertia).toBeCloseTo((mass / 12) * (400 + 400), 8);
    });

    it('should use infinite mass for static and kinematic bodies', () => {
      for (const type of [BodyType.STATIC, BodyType.KINEMATIC]) {
        const body = createPolygon({ vertices: square, type });
        expect(body.mass).toBe(Infinity);
        expect(body.invMass).toBe(0);
        expect(body.invInertia).toBe(0);
      }
    });
  });

  describe('validation', () => {
    it('should reject fewer than 3 vertices', () => {
      expect(() => createPolygon({ vertices: square.slice(0, 2) })).toThrow(/at least 3/);
    });

    it('should reject non-finite coordinates', () => {
      expect(() => createPolygon({ vertices: [{ x: 0, y: 0 }, { x: NaN, y: 1 }, { x: 1, y: 1 }] })).toThrow(/finite/);
    });

    it('should reject zero-area (collinear) outlines', () => {
      expect(() => createPolygon({ vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] })).toThrow(/zero area/);
    });

    it('should reject concave outlines', () => {
      const arrow = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 20 }, { x: 0, y: 20 }];
      expect(() => createPolygon({ vertices: arrow })).toThrow(/convex/);
    });

    it('should reject self-intersecting outlines', () => {
      const bowTie = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }];
      expect(() => createPolygon({ vertices: bowTie })).toThrow(/zero area|convex/);
    });

    it('should reject non-positive density on dynamic bodies', () => {
      expect(() => createPolygon({ vertices: square, material: { density: 0 } })).toThrow(/density/);
      expect(() => createPolygon({ vertices: square, type: BodyType.STATIC, material: { density: 0 } })).not.toThrow();
    });
  });
});
