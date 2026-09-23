import { describe, it, expect, beforeEach } from 'vitest';
import { raycast } from './raycast';
import { queryPoint, bodyContainsPoint } from './queryPoint';
import { queryAABB } from './queryAABB';
import { createWorld } from '../world/createWorld';
import { addBody } from '../world/body';
import { createCircle, resetBodyIdCounter } from '../bodies/createCircle';
import { createRectangle } from '../bodies/createRectangle';
import { createPolygon } from '../bodies/createPolygon';
import { getCurrentIdCount } from '../bodies/idGenerator';
import { BodyType } from '../types/BodyType';
import type { Body } from '../types/Body';
import * as Vec2 from '../core/Vector2';

const worldWith = (...bodies: Body[]) => {
  const world = createWorld({ gravity: { x: 0, y: 0 } });
  bodies.forEach((b) => addBody(world, b));
  return world;
};

describe('world queries', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('raycast', () => {
    it('should hit a circle at the analytic distance with an outward normal', () => {
      const ball = createCircle({ position: { x: 100, y: 0 }, radius: 10 });
      const hit = raycast(worldWith(ball), { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } })!;

      expect(hit.body).toBe(ball);
      expect(hit.distance).toBeCloseTo(90, 10);
      expect(hit.point).toEqual({ x: 90, y: 0 });
      expect(hit.normal.x).toBeCloseTo(-1, 10);
      expect(hit.normal.y).toBeCloseTo(0, 10);
    });

    it('should hit an off-center circle along the chord', () => {
      const ball = createCircle({ position: { x: 100, y: 6 }, radius: 10 });
      const hit = raycast(worldWith(ball), { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } })!;

      expect(hit.distance).toBeCloseTo(100 - 8, 10); // 6-8-10 triangle
      expect(hit.normal.x).toBeCloseTo(-0.8, 10);
      expect(hit.normal.y).toBeCloseTo(-0.6, 10);
    });

    it('should hit a rectangle face and a rotated rectangle corner region', () => {
      const wall = createRectangle({ position: { x: 50, y: 0 }, width: 20, height: 100 });
      const face = raycast(worldWith(wall), { origin: { x: 0, y: 10 }, direction: { x: 1, y: 0 } })!;
      expect(face.distance).toBeCloseTo(40, 10);
      expect(face.normal.x).toBeCloseTo(-1, 10);
      expect(face.normal.y).toBeCloseTo(0, 10);

      resetBodyIdCounter();
      const diamond = createRectangle({ position: { x: 50, y: 0 }, width: 20, height: 20, rotation: Math.PI / 4 });
      const hit = raycast(worldWith(diamond), { origin: { x: 0, y: 5 }, direction: { x: 1, y: 0 } })!;
      // Left vertex at x = 50 - 10√2; at y = 5 the edge is 5 px further right
      expect(hit.distance).toBeCloseTo(50 - 10 * Math.SQRT2 + 5, 8);
      expect(hit.normal.x).toBeCloseTo(-Math.SQRT1_2, 8);
      expect(hit.normal.y).toBeCloseTo(Math.SQRT1_2, 8);
    });

    it('should hit a triangle polygon', () => {
      const wedge = createPolygon({ position: { x: 0, y: 100 }, vertices: [{ x: -20, y: 10 }, { x: 20, y: 10 }, { x: 0, y: -20 }] });
      const hit = raycast(worldWith(wedge), { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } })!;

      expect(hit.distance).toBeCloseTo(80, 10); // apex at y = 80
      expect(hit.normal.y).toBeLessThan(0);
    });

    it('should return the closest of several bodies and respect maxDistance', () => {
      const far = createCircle({ position: { x: 200, y: 0 }, radius: 10 });
      const near = createRectangle({ position: { x: 100, y: 0 }, width: 10, height: 10 });
      const world = worldWith(far, near);

      expect(raycast(world, { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } })!.body).toBe(near);
      expect(raycast(world, { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 }, maxDistance: 90 })).toBeNull();
      expect(raycast(world, { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 }, maxDistance: 95 })!.body).toBe(near);
    });

    it('should normalize the direction', () => {
      const ball = createCircle({ position: { x: 100, y: 0 }, radius: 10 });
      const hit = raycast(worldWith(ball), { origin: { x: 0, y: 0 }, direction: { x: 25, y: 0 } })!;
      expect(hit.distance).toBeCloseTo(90, 10);
    });

    it('should ignore a shape containing the origin and hit the next one', () => {
      const own = createCircle({ position: { x: 0, y: 0 }, radius: 10 });
      const target = createRectangle({ position: { x: 50, y: 0 }, width: 10, height: 10 });
      const hit = raycast(worldWith(own, target), { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } })!;
      expect(hit.body).toBe(target);
    });

    it('should miss bodies behind the ray, beside it, or parallel to an edge outside', () => {
      const world = worldWith(
        createCircle({ position: { x: -50, y: 0 }, radius: 10 }),
        createRectangle({ position: { x: 50, y: 30 }, width: 20, height: 20 })
      );
      expect(raycast(world, { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } })).toBeNull();
    });

    it('should hit a circle it grazes tangentially', () => {
      const ball = createCircle({ position: { x: 50, y: 10 }, radius: 10 });
      const hit = raycast(worldWith(ball), { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } })!;
      expect(hit.distance).toBeCloseTo(50, 6);
    });

    it('should skip sensors unless asked, and honour layer masks and predicates', () => {
      const zone = createRectangle({ position: { x: 50, y: 0 }, width: 10, height: 10, type: BodyType.STATIC, isSensor: true });
      const wall = createRectangle({ position: { x: 100, y: 0 }, width: 10, height: 10, layer: 2 });
      const world = worldWith(zone, wall);
      const ray = { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } };

      expect(raycast(world, ray)!.body).toBe(wall);
      expect(raycast(world, { ...ray, filter: { includeSensors: true } })!.body).toBe(zone);
      expect(raycast(world, { ...ray, filter: { collidesWith: 1 } })).toBeNull();
      expect(raycast(world, { ...ray, filter: { predicate: (b) => b !== wall } })).toBeNull();
    });

    it('should reject a zero or non-finite direction and a negative maxDistance', () => {
      const world = worldWith();
      expect(() => raycast(world, { origin: { x: 0, y: 0 }, direction: { x: 0, y: 0 } })).toThrow(RangeError);
      expect(() => raycast(world, { origin: { x: 0, y: 0 }, direction: { x: NaN, y: 1 } })).toThrow(RangeError);
      expect(() => raycast(world, { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 }, maxDistance: -1 })).toThrow(RangeError);
    });

    it('should agree with a brute-force march along the ray for random shapes', () => {
      let seed = 11;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      let compared = 0;

      for (let i = 0; i < 150; i++) {
        resetBodyIdCounter();
        const kind = i % 3;
        const center = { x: 60 + rand() * 40, y: (rand() - 0.5) * 40 };
        const body =
          kind === 0
            ? createCircle({ position: center, radius: 8 + rand() * 12 })
            : kind === 1
              ? createRectangle({ position: center, width: 10 + rand() * 30, height: 10 + rand() * 30, rotation: rand() * Math.PI })
              : createPolygon({
                  position: center,
                  rotation: rand() * Math.PI,
                  vertices: [0, 1, 2, 3, 4].map((j) => ({ x: Math.cos(j * 1.2566) * 15, y: Math.sin(j * 1.2566) * 15 })),
                });
        // Aim near the shape so most rays hit (some still miss or graze)
        const direction = Vec2.normalize({ x: center.x, y: center.y + (rand() - 0.5) * 40 });
        const hit = raycast(worldWith(body), { origin: { x: 0, y: 0 }, direction });

        // March in 0.01 px steps to the first point inside the shape
        let marched: number | null = null;
        for (let t = 0; t < 200; t += 0.01) {
          if (bodyContainsPoint(body, Vec2.scale(direction, t))) {
            marched = t;
            break;
          }
        }

        expect(hit === null).toBe(marched === null);
        if (!hit || marched === null) continue;
        compared++;
        expect(Math.abs(hit.distance - marched)).toBeLessThan(0.011);
        expect(Vec2.length(hit.normal)).toBeCloseTo(1, 10);
        expect(Vec2.dot(hit.normal, direction)).toBeLessThanOrEqual(1e-9); // faces the ray
      }
      expect(compared).toBeGreaterThan(80);
    });
  });

  describe('queryPoint', () => {
    it('should find bodies whose shape contains the point, boundary included', () => {
      const ball = createCircle({ position: { x: 0, y: 0 }, radius: 10 });
      const box = createRectangle({ position: { x: 5, y: 0 }, width: 10, height: 10 });
      const world = worldWith(ball, box);

      expect(queryPoint(world, { x: 2, y: 0 })).toEqual([ball, box]);
      expect(queryPoint(world, { x: -10, y: 0 })).toEqual([ball]); // on the circle
      expect(queryPoint(world, { x: 10, y: 5 })).toEqual([box]); // box corner
      expect(queryPoint(world, { x: 30, y: 30 })).toEqual([]);
    });

    it('should exclude points inside a rotated box AABB but outside the box', () => {
      const diamond = createRectangle({ width: 20, height: 20, rotation: Math.PI / 4 });
      const world = worldWith(diamond);

      expect(queryPoint(world, { x: 12, y: 12 })).toEqual([]); // AABB corner region
      expect(queryPoint(world, { x: 0, y: 13 })).toEqual([diamond]);
    });

    it('should include sensors by default and apply the filter', () => {
      const zone = createCircle({ radius: 10, isSensor: true, layer: 4 });
      const world = worldWith(zone);

      expect(queryPoint(world, { x: 0, y: 0 })).toEqual([zone]);
      expect(queryPoint(world, { x: 0, y: 0 }, { includeSensors: false })).toEqual([]);
      expect(queryPoint(world, { x: 0, y: 0 }, { collidesWith: 1 })).toEqual([]);
    });
  });

  describe('queryAABB', () => {
    const box = (minX: number, minY: number, maxX: number, maxY: number) => ({
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY },
    });

    it('should find bodies overlapping the region, including ones fully inside or around it', () => {
      const small = createCircle({ position: { x: 10, y: 10 }, radius: 2 });
      const big = createRectangle({ position: { x: 100, y: 100 }, width: 400, height: 400 });
      const outside = createCircle({ position: { x: -500, y: 0 }, radius: 5 });
      const world = worldWith(small, big, outside);

      expect(queryAABB(world, box(0, 0, 20, 20))).toEqual([small, big]);
    });

    it('should use exact shapes, not just AABBs', () => {
      const diamond = createRectangle({ position: { x: 0, y: 0 }, width: 20, height: 20, rotation: Math.PI / 4 });
      const ball = createCircle({ position: { x: 0, y: 40 }, radius: 10 });
      const world = worldWith(diamond, ball);

      // Region in the corner gaps of both AABBs
      expect(queryAABB(world, box(11, 11, 14, 14))).toEqual([]);
      expect(queryAABB(world, box(8, 31, 10, 32))).toEqual([]); // in the ball's AABB, 11.3 px from its center
      expect(queryAABB(world, box(-2, -2, 2, 2))).toEqual([diamond]);
    });

    it('should handle a zero-size region like a point query', () => {
      const ball = createCircle({ radius: 10 });
      const world = worldWith(ball);
      expect(queryAABB(world, box(3, 3, 3, 3))).toEqual([ball]);
      expect(queryAABB(world, box(30, 30, 30, 30))).toEqual([]);
    });

    it('should return nothing for an inverted region and apply filters', () => {
      const ball = createCircle({ radius: 10, layer: 2 });
      const world = worldWith(ball);
      expect(queryAABB(world, box(5, 5, -5, -5))).toEqual([]);
      expect(queryAABB(world, box(-5, -5, 5, 5), { collidesWith: 1 })).toEqual([]);
      expect(queryAABB(world, box(-5, -5, 5, 5), { collidesWith: 2 })).toEqual([ball]);
    });

    it('should not consume body IDs', () => {
      const world = worldWith(createCircle({ radius: 10 }));
      const before = getCurrentIdCount();
      queryAABB(world, box(-5, -5, 5, 5));
      expect(getCurrentIdCount()).toBe(before);
    });
  });
});
