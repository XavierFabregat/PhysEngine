import { describe, it, expect, beforeEach } from 'vitest';
import { detectCirclePolygon } from './circlePolygon';
import { detectCircleRectangle } from './circleRectangle';
import { createCircle, resetBodyIdCounter } from '../../bodies/createCircle';
import { createRectangle } from '../../bodies/createRectangle';
import { createPolygon } from '../../bodies/createPolygon';
import * as Vec2 from '../../core/Vector2';

// Triangle with base y = 10 from x = -20..20 and apex (0, -20); centroid at origin
const triangle = () =>
  createPolygon({ vertices: [{ x: -20, y: 10 }, { x: 20, y: 10 }, { x: 0, y: -20 }] });
const ball = (x: number, y: number, radius = 10) => createCircle({ position: { x, y }, radius });

describe('detectCirclePolygon', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  it('should return null when separated', () => {
    expect(detectCirclePolygon(ball(0, 25), triangle())).toBeNull();
    expect(detectCirclePolygon(ball(0, -40), triangle())).toBeNull();
  });

  it('should return null for non circle/polygon pairs', () => {
    expect(detectCirclePolygon(triangle(), ball(0, 0))).toBeNull();
    expect(detectCirclePolygon(ball(0, 0), createRectangle({ width: 10, height: 10 }))).toBeNull();
  });

  it('should detect a face contact on the base', () => {
    const contact = detectCirclePolygon(ball(3, 18), triangle())!;

    expect(contact.normal.x).toBeCloseTo(0, 10);
    expect(contact.normal.y).toBeCloseTo(-1, 10); // circle (below) → triangle (above)
    expect(contact.depth).toBeCloseTo(2, 10);
    expect(contact.point.x).toBeCloseTo(3, 10);
    expect(contact.point.y).toBeCloseTo(10, 10);
    expect(contact.points).toEqual([contact.point]);
  });

  it('should detect a vertex contact at the apex', () => {
    const contact = detectCirclePolygon(ball(0, -28), triangle())!;

    expect(contact.point.x).toBeCloseTo(0, 10);
    expect(contact.point.y).toBeCloseTo(-20, 10);
    expect(contact.normal.y).toBeCloseTo(1, 10);
    expect(contact.depth).toBeCloseTo(2, 10);
  });

  it('should push a circle whose center is inside out through the nearest face', () => {
    const contact = detectCirclePolygon(ball(0, 8), triangle())!;

    // 2 px above the base: exit downward, so normal (circle → polygon) points up
    expect(contact.normal.y).toBeCloseTo(-1, 10);
    expect(contact.depth).toBeCloseTo(10 + 2, 10);
    expect(contact.point.y).toBeCloseTo(10, 10);
  });

  it('should agree with detectCircleRectangle for a rectangle-shaped polygon', () => {
    const rect = createRectangle({ position: { x: 5, y: -3 }, width: 60, height: 30, rotation: 0.4 });
    const poly = createPolygon({
      position: { x: 5, y: -3 },
      rotation: 0.4,
      vertices: [{ x: -30, y: -15 }, { x: 30, y: -15 }, { x: 30, y: 15 }, { x: -30, y: 15 }],
    });

    let compared = 0;
    for (let i = 0; i < 360; i++) {
      const angle = (i / 360) * Math.PI * 2;
      const distance = 20 + (i % 7) * 4;
      const circle = ball(5 + Math.cos(angle) * distance, -3 + Math.sin(angle) * distance, 9);

      const expected = detectCircleRectangle(circle, rect);
      const actual = detectCirclePolygon(circle, poly);
      expect(actual === null).toBe(expected === null);
      if (!expected || !actual) continue;
      compared++;

      expect(actual.depth).toBeCloseTo(expected.depth, 8);
      expect(actual.normal.x).toBeCloseTo(expected.normal.x, 8);
      expect(actual.normal.y).toBeCloseTo(expected.normal.y, 8);
      expect(actual.point.x).toBeCloseTo(expected.point.x, 8);
      expect(actual.point.y).toBeCloseTo(expected.point.y, 8);
    }
    expect(compared).toBeGreaterThan(100);
  });

  it('should separate the circle when moved back along the normal by depth', () => {
    const poly = createPolygon({
      position: { x: 0, y: 0 },
      rotation: 0.9,
      vertices: [0, 1, 2, 3, 4].map((i) => ({ x: Math.cos(i * 1.2566) * 25, y: Math.sin(i * 1.2566) * 25 })),
    });
    for (let i = 0; i < 200; i++) {
      const angle = i * 0.37;
      const circle = ball(Math.cos(angle) * (5 + (i % 30)), Math.sin(angle) * (5 + (i % 30)), 8);
      const contact = detectCirclePolygon(circle, poly);
      if (!contact) continue;

      expect(Vec2.length(contact.normal)).toBeCloseTo(1, 10);
      circle.position = Vec2.sub(circle.position, Vec2.scale(contact.normal, contact.depth + 1e-6));
      const after = detectCirclePolygon(circle, poly);
      expect(after === null || after.depth < 1e-5).toBe(true);
    }
  });
});
