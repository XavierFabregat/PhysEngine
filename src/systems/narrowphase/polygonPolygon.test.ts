import { describe, it, expect, beforeEach } from 'vitest';
import { detectPolygonPolygon } from './polygonPolygon';
import { createRectangle, resetBodyIdCounter } from '../../bodies/createRectangle';
import { createPolygon } from '../../bodies/createPolygon';
import { createCircle } from '../../bodies/createCircle';
import type { Body } from '../../types/Body';
import * as Vec2 from '../../core/Vector2';

const box = (x: number, y: number, w = 20, h = 20, rotation = 0) =>
  createRectangle({ position: { x, y }, width: w, height: h, rotation });

const sortByX = (points: readonly { x: number; y: number }[] = []) =>
  [...points].sort((a, b) => a.x - b.x || a.y - b.y);

describe('detectPolygonPolygon', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('no contact', () => {
    it('should return null for separated boxes', () => {
      expect(detectPolygonPolygon(box(0, 0), box(25, 0))).toBeNull();
    });

    it('should return null for rotated boxes whose AABBs overlap but shapes do not', () => {
      // Two diamonds side by side: AABBs overlap, but the separating axis is diagonal
      const d = 20 * Math.SQRT2; // diamond AABB width ≈ 28.3
      const a = box(0, 0, 20, 20, Math.PI / 4);
      const b = box(d * 0.9, d * 0.9, 20, 20, Math.PI / 4);
      expect(detectPolygonPolygon(a, b)).toBeNull();
    });

    it('should return null for non-polygon shapes', () => {
      expect(detectPolygonPolygon(createCircle({ radius: 10 }), box(0, 0))).toBeNull();
    });
  });

  describe('axis-aligned boxes', () => {
    it('should report depth, normal and a two-point manifold for side-by-side boxes', () => {
      const contact = detectPolygonPolygon(box(0, 0), box(15, 0))!;

      expect(contact.depth).toBeCloseTo(5, 10);
      expect(contact.normal.x).toBeCloseTo(1, 10);
      expect(contact.normal.y).toBeCloseTo(0, 10);
      expect(sortByX(contact.points)).toEqual([{ x: 5, y: -10 }, { x: 5, y: 10 }]);
      expect(contact.point).toEqual({ x: 5, y: 0 });
    });

    it('should give a box resting on a wide floor two points spanning its bottom face', () => {
      // Floor top at y = 100; box bottom at y = 101 (1 px into the floor)
      const crate = box(50, 91);
      const floor = box(0, 120, 800, 40);

      const contact = detectPolygonPolygon(crate, floor)!;

      // Normal from the box (A) to the floor (B): down the screen
      expect(contact.normal.x).toBeCloseTo(0, 10);
      expect(contact.normal.y).toBeCloseTo(1, 10);
      expect(contact.depth).toBeCloseTo(1, 10);
      const [p1, p2] = sortByX(contact.points);
      expect(p1!.x).toBeCloseTo(40, 10);
      expect(p2!.x).toBeCloseTo(60, 10);
    });

    it('should clip the manifold to the overlap when a box hangs over an edge', () => {
      // 20 px box, 5 px of it over a ledge that ends at x = 0
      const crate = box(5, -9.5);
      const ledge = box(-100, 20, 200, 40); // top at y = 0, right edge at x = 0

      const contact = detectPolygonPolygon(crate, ledge)!;
      const xs = sortByX(contact.points).map((p) => p.x);

      expect(xs[0]).toBeCloseTo(-5, 10);
      expect(xs[1]).toBeCloseTo(0, 10);
    });

    it('should use the least-penetration axis', () => {
      // Overlap 6 px in x, 2 px in y: must push out along y
      const contact = detectPolygonPolygon(box(0, 0), box(14, 18))!;
      expect(contact.depth).toBeCloseTo(2, 10);
      expect(contact.normal.x).toBeCloseTo(0, 10);
      expect(contact.normal.y).toBeCloseTo(1, 10);
    });
  });

  describe('rotated shapes', () => {
    it('should give a single corner point for a 45° box landing on a floor', () => {
      const corner = 10 * Math.SQRT2; // half-diagonal
      const diamond = box(0, 100 - corner + 1.5, 20, 20, Math.PI / 4); // corner 1.5 px into floor
      const floor = box(0, 120, 400, 40); // top at y = 100

      const contact = detectPolygonPolygon(diamond, floor)!;

      expect(contact.points).toHaveLength(1);
      expect(contact.points![0]!.x).toBeCloseTo(0, 8);
      expect(contact.points![0]!.y).toBeCloseTo(101.5, 8);
      expect(contact.normal.x).toBeCloseTo(0, 10);
      expect(contact.normal.y).toBeCloseTo(1, 10);
      expect(contact.depth).toBeCloseTo(1.5, 8);
    });

    it('should detect a triangle against a box', () => {
      const triangle = createPolygon({
        position: { x: 0, y: 0 },
        vertices: [{ x: -10, y: 8 }, { x: 10, y: 8 }, { x: 0, y: -12 }],
      });
      const floor = box(0, 27, 100, 40); // top at y = 7 → 1 px overlap with the base

      const contact = detectPolygonPolygon(triangle, floor)!;

      expect(contact.depth).toBeCloseTo(1, 10);
      expect(contact.normal.y).toBeCloseTo(1, 10);
      expect(contact.points).toHaveLength(2);
    });
  });

  describe('symmetry and invariants', () => {
    it('should negate the normal when the bodies are swapped', () => {
      const a = box(0, 0, 30, 20, 0.3);
      const b = box(18, 6, 25, 25, -0.2);

      const ab = detectPolygonPolygon(a, b)!;
      const ba = detectPolygonPolygon(b, a)!;

      expect(ba.depth).toBeCloseTo(ab.depth, 10);
      expect(ba.normal.x).toBeCloseTo(-ab.normal.x, 10);
      expect(ba.normal.y).toBeCloseTo(-ab.normal.y, 10);
    });

    it('should separate the bodies when B moves along the normal by the depth', () => {
      // Deterministic pseudo-random rotated boxes and polygons
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const makeShape = (x: number, y: number): Body => {
        if (rand() < 0.5) return box(x, y, 10 + rand() * 30, 10 + rand() * 30, rand() * Math.PI);
        // Regular-ish convex polygon: fixed radius keeps every vertex convex
        const count = 3 + Math.floor(rand() * 4);
        const r = 10 + rand() * 8;
        const offset = rand() * Math.PI;
        return createPolygon({
          position: { x, y },
          rotation: rand() * Math.PI,
          vertices: Array.from({ length: count }, (_, i) => {
            const angle = offset + (i / count) * Math.PI * 2;
            return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
          }),
        });
      };

      let checked = 0;
      for (let i = 0; i < 300; i++) {
        const a = makeShape(0, 0);
        const b = makeShape((rand() - 0.5) * 40, (rand() - 0.5) * 40);
        const contact = detectPolygonPolygon(a, b);
        if (!contact) continue;
        checked++;

        expect(Vec2.length(contact.normal)).toBeCloseTo(1, 10);
        expect(contact.depth).toBeGreaterThanOrEqual(0);
        expect(contact.points!.length).toBeGreaterThanOrEqual(1);
        expect(contact.points!.length).toBeLessThanOrEqual(2);

        b.position = Vec2.add(b.position, Vec2.scale(contact.normal, contact.depth + 1e-6));
        const after = detectPolygonPolygon(a, b);
        expect(after === null || after.depth < 1e-5).toBe(true);
      }

      expect(checked).toBeGreaterThan(100);
    });
  });
});
