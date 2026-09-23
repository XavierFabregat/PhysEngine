import { describe, it, expect, beforeEach } from 'vitest';
import { detectCircleRectangle } from './circleRectangle';
import { createCircle, resetBodyIdCounter } from '../../bodies/createCircle';
import { createRectangle } from '../../bodies/createRectangle';
import * as Vec2 from '../../core/Vector2';

// 100 x 40 box centred at (0, 0): faces at x = ±50, y = ±20
const box = (rotation = 0) =>
  createRectangle({ position: { x: 0, y: 0 }, width: 100, height: 40, rotation });
const ball = (x: number, y: number, radius = 10) =>
  createCircle({ position: { x, y }, radius });

describe('detectCircleRectangle', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('no contact', () => {
    it('should return null when the circle is far away', () => {
      expect(detectCircleRectangle(ball(0, -100), box())).toBeNull();
    });

    it('should return null near a corner even when the AABBs overlap', () => {
      // Circle AABB overlaps the box AABB, but the corner is ~6.97 px from the
      // circle surface along the diagonal
      expect(detectCircleRectangle(ball(62, -32), box())).toBeNull();
    });

    it('should return null for non circle/rectangle shape pairs', () => {
      expect(detectCircleRectangle(box(), ball(0, 0))).toBeNull();
      expect(detectCircleRectangle(ball(0, 0), ball(5, 0))).toBeNull();
    });
  });

  describe('face contact', () => {
    it('should detect a circle resting into the top face (y-down)', () => {
      const contact = detectCircleRectangle(ball(10, -28), box());

      expect(contact).not.toBeNull();
      // Normal points from the circle (A) to the rectangle (B): down the screen
      expect(contact!.normal.x).toBeCloseTo(0, 10);
      expect(contact!.normal.y).toBeCloseTo(1, 10);
      expect(contact!.depth).toBeCloseTo(2, 10);
      expect(contact!.point.x).toBeCloseTo(10, 10);
      expect(contact!.point.y).toBeCloseTo(-20, 10);
    });

    it('should detect a circle touching the right face', () => {
      const contact = detectCircleRectangle(ball(55, 0), box());

      expect(contact!.normal.x).toBeCloseTo(-1, 10);
      expect(contact!.normal.y).toBeCloseTo(0, 10);
      expect(contact!.depth).toBeCloseTo(5, 10);
      expect(contact!.point).toEqual({ x: 50, y: 0 });
    });

    it('should report depth 0 when exactly touching', () => {
      const contact = detectCircleRectangle(ball(0, 30), box());
      expect(contact!.depth).toBeCloseTo(0, 10);
    });
  });

  describe('corner contact', () => {
    it('should use the diagonal from the circle center to the corner', () => {
      // Corner at (50, -20); circle center 6 px right and 6 px up from it
      const contact = detectCircleRectangle(ball(56, -26), box());

      const d = Math.hypot(6, 6);
      expect(contact!.point.x).toBeCloseTo(50, 10);
      expect(contact!.point.y).toBeCloseTo(-20, 10);
      expect(contact!.normal.x).toBeCloseTo(-Math.SQRT1_2, 10);
      expect(contact!.normal.y).toBeCloseTo(Math.SQRT1_2, 10);
      expect(contact!.depth).toBeCloseTo(10 - d, 10);
    });
  });

  describe('circle center inside the rectangle', () => {
    it('should push out through the nearest face', () => {
      // 5 px below the top face, 45 px from the side faces
      const contact = detectCircleRectangle(ball(5, -15), box());

      // Circle must move up (-y) to escape, so normal (A→B) is +y
      expect(contact!.normal.x).toBeCloseTo(0, 10);
      expect(contact!.normal.y).toBeCloseTo(1, 10);
      expect(contact!.depth).toBeCloseTo(10 + 5, 10);
      expect(contact!.point).toEqual({ x: 5, y: -20 });
    });

    it('should pick a side face when it is nearer', () => {
      const contact = detectCircleRectangle(ball(-47, 3), box());

      expect(contact!.normal.x).toBeCloseTo(1, 10);
      expect(contact!.normal.y).toBeCloseTo(0, 10);
      expect(contact!.depth).toBeCloseTo(10 + 3, 10);
      expect(contact!.point).toEqual({ x: -50, y: 3 });
    });

    it('should resolve a dead-center tie toward the y axis', () => {
      const square = createRectangle({ width: 40, height: 40 });
      const contact = detectCircleRectangle(ball(0, 0), square);

      expect(contact!.normal.x).toBeCloseTo(0, 10);
      expect(Math.abs(contact!.normal.y)).toBeCloseTo(1, 10);
      expect(contact!.depth).toBeCloseTo(10 + 20, 10);
    });
  });

  describe('rotated rectangles', () => {
    it('should treat a 90° rotation as swapping width and height', () => {
      // Rotated 90°, the box spans x = ±20, y = ±50
      const contact = detectCircleRectangle(ball(28, 0), box(Math.PI / 2));

      expect(contact!.normal.x).toBeCloseTo(-1, 10);
      expect(contact!.normal.y).toBeCloseTo(0, 10);
      expect(contact!.depth).toBeCloseTo(2, 10);
      expect(contact!.point.x).toBeCloseTo(20, 10);
      expect(contact!.point.y).toBeCloseTo(0, 10);
    });

    it('should hit the top vertex of a 45° diamond along the vertical', () => {
      const diamond = createRectangle({ width: 40, height: 40, rotation: Math.PI / 4 });
      const top = -20 * Math.SQRT2; // vertex at (0, -28.28)

      const contact = detectCircleRectangle(ball(0, top - 8), diamond);

      expect(contact!.point.x).toBeCloseTo(0, 10);
      expect(contact!.point.y).toBeCloseTo(top, 10);
      expect(contact!.normal.x).toBeCloseTo(0, 10);
      expect(contact!.normal.y).toBeCloseTo(1, 10);
      expect(contact!.depth).toBeCloseTo(2, 10);
    });

    it('should report a slope normal on a tilted face', () => {
      const angle = Math.PI / 6; // 30°
      const ramp = createRectangle({ width: 200, height: 20, rotation: angle });
      // Point 5 px above the ramp's top face at its center, along the face normal
      const faceNormalOut = Vec2.rotate({ x: 0, y: -1 }, angle);
      const center = Vec2.scale(faceNormalOut, 10 + 5);

      const contact = detectCircleRectangle(ball(center.x, center.y), ramp);

      expect(contact!.normal.x).toBeCloseTo(-faceNormalOut.x, 10);
      expect(contact!.normal.y).toBeCloseTo(-faceNormalOut.y, 10);
      expect(contact!.depth).toBeCloseTo(5, 10);
    });
  });

  describe('contact invariants', () => {
    it('should return unit normals and points on the rectangle boundary', () => {
      const rect = createRectangle({ position: { x: 30, y: -10 }, width: 80, height: 50, rotation: 0.7 });
      let checked = 0;

      for (let i = 0; i < 400; i++) {
        const angle = (i / 400) * Math.PI * 2;
        const distance = 5 + (i % 9) * 6;
        const circle = ball(30 + Math.cos(angle) * distance, -10 + Math.sin(angle) * distance, 12);
        const contact = detectCircleRectangle(circle, rect);
        if (!contact) continue;
        checked++;

        expect(Vec2.length(contact.normal)).toBeCloseTo(1, 10);
        expect(contact.depth).toBeGreaterThanOrEqual(0);

        // Point lies on the boundary: in local space one coordinate sits on a face
        const local = Vec2.rotate(Vec2.sub(contact.point, rect.position), -rect.rotation);
        const onVerticalFace = Math.abs(Math.abs(local.x) - 40) < 1e-9 && Math.abs(local.y) <= 25 + 1e-9;
        const onHorizontalFace = Math.abs(Math.abs(local.y) - 25) < 1e-9 && Math.abs(local.x) <= 40 + 1e-9;
        expect(onVerticalFace || onHorizontalFace).toBe(true);

        // Moving the circle back along the normal by `depth` just separates it
        const moved = ball(
          circle.position.x - contact.normal.x * (contact.depth + 1e-6),
          circle.position.y - contact.normal.y * (contact.depth + 1e-6),
          12
        );
        const after = detectCircleRectangle(moved, rect);
        expect(after === null || after.depth < 1e-5).toBe(true);
      }

      expect(checked).toBeGreaterThan(100);
    });
  });
});
