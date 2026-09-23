import { describe, it, expect, beforeEach } from 'vitest';
import { ShapeDispatchNarrowPhase } from './ShapeDispatchNarrowPhase';
import { detectCircleCircle } from './circleCircle';
import { detectCircleRectangle } from './circleRectangle';
import { detectCirclePolygon } from './circlePolygon';
import { detectPolygonPolygon } from './polygonPolygon';
import { createPolygon } from '../../bodies/createPolygon';
import { createCircle, resetBodyIdCounter } from '../../bodies/createCircle';
import { createRectangle } from '../../bodies/createRectangle';

describe('ShapeDispatchNarrowPhase', () => {
  let narrowPhase: ShapeDispatchNarrowPhase;

  beforeEach(() => {
    narrowPhase = new ShapeDispatchNarrowPhase();
    resetBodyIdCounter();
  });

  it('should delegate circle/circle to detectCircleCircle', () => {
    const a = createCircle({ radius: 10 });
    const b = createCircle({ position: { x: 15, y: 0 }, radius: 10 });

    expect(narrowPhase.detect(a, b)).toEqual(detectCircleCircle(a, b));
  });

  it('should delegate circle/rectangle to detectCircleRectangle', () => {
    const ball = createCircle({ position: { x: 0, y: -28 }, radius: 10 });
    const floor = createRectangle({ width: 100, height: 40 });

    expect(narrowPhase.detect(ball, floor)).toEqual(detectCircleRectangle(ball, floor));
  });

  it('should flip the normal for rectangle/circle so it still points from A to B', () => {
    const ball = createCircle({ position: { x: 0, y: -28 }, radius: 10 });
    const floor = createRectangle({ width: 100, height: 40 });

    const forward = narrowPhase.detect(ball, floor)!;
    const reversed = narrowPhase.detect(floor, ball)!;

    // floor → ball points up the screen
    expect(reversed.normal.x).toBeCloseTo(0, 10);
    expect(reversed.normal.y).toBeCloseTo(-1, 10);
    expect(reversed.normal.x).toBeCloseTo(-forward.normal.x, 10);
    expect(reversed.normal.y).toBeCloseTo(-forward.normal.y, 10);
    expect(reversed.depth).toBe(forward.depth);
    expect(reversed.point).toEqual(forward.point);
  });

  it('should dispatch rectangle/rectangle and polygon pairs to SAT', () => {
    const a = createRectangle({ width: 20, height: 20 });
    const b = createRectangle({ position: { x: 15, y: 0 }, width: 20, height: 20 });

    const contact = narrowPhase.detect(a, b);
    expect(contact).toEqual(detectPolygonPolygon(a, b));
    expect(contact?.depth).toBeCloseTo(5, 10);
  });

  it('should dispatch polygon/circle with the normal flipped', () => {
    const triangle = createPolygon({ vertices: [{ x: -20, y: 10 }, { x: 20, y: 10 }, { x: 0, y: -20 }] });
    // Bottom edge at y = 10; ball 2 px into it
    const ball = createCircle({ position: { x: 0, y: 18 }, radius: 10 });

    const forward = narrowPhase.detect(ball, triangle)!;
    const reversed = narrowPhase.detect(triangle, ball)!;

    expect(forward).toEqual(detectCirclePolygon(ball, triangle));
    expect(reversed.normal.x).toBeCloseTo(-forward.normal.x, 10);
    expect(reversed.normal.y).toBeCloseTo(-forward.normal.y, 10);
    expect(reversed.points).toEqual(forward.points);
  });

  it('should return null for unsupported shape pairs', () => {
    const a = createCircle({ radius: 10 });
    const odd = { ...createCircle({ radius: 10 }), shape: { type: 'capsule' } } as unknown as typeof a;

    expect(narrowPhase.detect(a, odd)).toBeNull();
    expect(narrowPhase.detect(odd, a)).toBeNull();
  });

  it('should allow registering a detector for a new shape pair', () => {
    const a = createRectangle({ width: 20, height: 20 });
    const b = createRectangle({ position: { x: 5, y: 0 }, width: 20, height: 20 });
    const fake = { point: { x: 1, y: 2 }, normal: { x: 1, y: 0 }, depth: 3 };

    narrowPhase.register('rectangle', 'rectangle', () => fake);

    expect(narrowPhase.detect(a, b)).toBe(fake);
  });
});
