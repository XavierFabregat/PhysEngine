import { describe, it, expect, beforeEach } from 'vitest';
import { detectCircleChain, detectPolygonChain } from './chain';
import { createChain } from '../../bodies/createChain';
import { createCircle, resetBodyIdCounter } from '../../bodies/createCircle';
import { createRectangle } from '../../bodies/createRectangle';

// Flat floor from x = 0..200 at y = 100, made of two collinear segments (joint at x = 100)
const floor = () => createChain({ points: [{ x: 0, y: 100 }, { x: 100, y: 100 }, { x: 200, y: 100 }] });

describe('chain narrow phase', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('circle vs chain', () => {
    it('should push a circle out along the segment normal', () => {
      const contact = detectCircleChain(createCircle({ position: { x: 40, y: 92 }, radius: 10 }), floor())!;
      expect(contact.normal.x).toBeCloseTo(0, 10);
      expect(contact.normal.y).toBeCloseTo(1, 10); // circle (above) → chain (below)
      expect(contact.depth).toBeCloseTo(2, 10);
      expect(contact.point).toEqual({ x: 40, y: 100 });
    });

    it('should give the same contact on either side of a joint', () => {
      const left = detectCircleChain(createCircle({ position: { x: 99.999, y: 92 }, radius: 10 }), floor())!;
      const right = detectCircleChain(createCircle({ position: { x: 100.001, y: 92 }, radius: 10 }), floor())!;
      expect(left.normal.y).toBeCloseTo(right.normal.y, 6);
      expect(left.depth).toBeCloseTo(right.depth, 6);
    });

    it('should point the normal at a convex corner vertex', () => {
      const peak = createChain({ points: [{ x: 0, y: 100 }, { x: 50, y: 50 }, { x: 100, y: 100 }] });
      const contact = detectCircleChain(createCircle({ position: { x: 50, y: 42 }, radius: 10 }), peak)!;
      expect(contact.point).toEqual({ x: 50, y: 50 });
      expect(contact.normal.x).toBeCloseTo(0, 10);
      expect(contact.normal.y).toBeCloseTo(1, 10);
    });

    it('should return null when out of reach and include the closing segment of a loop', () => {
      expect(detectCircleChain(createCircle({ position: { x: 40, y: 80 }, radius: 10 }), floor())).toBeNull();
      const triangle = createChain({ points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }], loop: true });
      // Near the closing edge x = 0 (from (0,100) back to (0,0))
      expect(detectCircleChain(createCircle({ position: { x: -5, y: 50 }, radius: 10 }), triangle)).not.toBeNull();
    });
  });

  describe('polygon vs chain', () => {
    it('should rest a box on a segment with two points and the segment normal', () => {
      const box = createRectangle({ position: { x: 40, y: 91 }, width: 20, height: 20 }); // bottom at 101: 1 px in
      const contact = detectPolygonChain(box, floor())!;
      expect(contact.normal.x).toBeCloseTo(0, 10);
      expect(contact.normal.y).toBeCloseTo(1, 10);
      expect(contact.depth).toBeCloseTo(1, 10);
      expect(contact.points).toHaveLength(2);
    });

    it('should not catch a box straddling an interior joint (no sideways normal)', () => {
      const box = createRectangle({ position: { x: 100, y: 91 }, width: 20, height: 20 });
      const contact = detectPolygonChain(box, floor())!;
      expect(contact.normal.x).toBeCloseTo(0, 10);
      expect(contact.normal.y).toBeCloseTo(1, 10);
    });

    it('should push a box sideways off a free end of the chain', () => {
      // Box to the right of the chain's end at x = 200, its left face 1 px past the end
      const box = createRectangle({ position: { x: 209, y: 100 }, width: 20, height: 40 });
      const contact = detectPolygonChain(box, floor())!;
      expect(contact.normal.x).toBeCloseTo(-1, 10); // box → chain end, pointing left
      expect(contact.normal.y).toBeCloseTo(0, 10);
      expect(contact.depth).toBeCloseTo(1, 10);
    });

    it('should return null when separated', () => {
      expect(detectPolygonChain(createRectangle({ position: { x: 40, y: 80 }, width: 20, height: 20 }), floor())).toBeNull();
    });
  });
});
