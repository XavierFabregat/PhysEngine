import { describe, it, expect, beforeEach } from 'vitest';
import { detectCircleCircle } from './circleCircle';
import { createCircle, resetBodyIdCounter } from '../../bodies/createCircle';
import { createRectangle } from '../../bodies/createRectangle';

describe('detectCircleCircle', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('non-colliding cases', () => {
    it('should return null when circles are far apart', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 100, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact).toBeNull();
    });

    it('should return null when circles barely miss', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 20.1, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact).toBeNull();
    });

    it('should return null if bodyA is not a circle', () => {
      const rect = createRectangle({
        position: { x: 0, y: 0 },
        width: 20,
        height: 20
      });
      const circle = createCircle({
        position: { x: 5, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(rect, circle);

      expect(contact).toBeNull();
    });

    it('should return null if bodyB is not a circle', () => {
      const circle = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const rect = createRectangle({
        position: { x: 5, y: 0 },
        width: 20,
        height: 20
      });

      const contact = detectCircleCircle(circle, rect);

      expect(contact).toBeNull();
    });
  });

  describe('colliding cases', () => {
    it('should detect collision when circles overlap', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact).not.toBeNull();
      expect(contact!.depth).toBeGreaterThan(0);
    });

    it('should detect collision when circles just touch', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 20, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact).not.toBeNull();
      expect(contact!.depth).toBeCloseTo(0, 10);
    });

    it('should detect collision when circles are at exact same position', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact).not.toBeNull();
      expect(contact!.depth).toBe(20); // Sum of radii
      expect(contact!.normal).toEqual({ x: 1, y: 0 }); // Arbitrary direction
    });
  });

  describe('contact depth', () => {
    it('should calculate correct depth for overlapping circles', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      // Distance = 15, sum of radii = 20, depth = 20 - 15 = 5
      expect(contact!.depth).toBeCloseTo(5, 10);
    });

    it('should calculate correct depth for deeply overlapping circles', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 5, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      // Distance = 5, sum of radii = 20, depth = 20 - 5 = 15
      expect(contact!.depth).toBeCloseTo(15, 10);
    });

    it('should calculate correct depth for circles of different sizes', () => {
      const smallCircle = createCircle({
        position: { x: 0, y: 0 },
        radius: 5
      });
      const largeCircle = createCircle({
        position: { x: 20, y: 0 },
        radius: 20
      });

      const contact = detectCircleCircle(smallCircle, largeCircle);

      // Distance = 20, sum of radii = 25, depth = 25 - 20 = 5
      expect(contact!.depth).toBeCloseTo(5, 10);
    });
  });

  describe('contact normal', () => {
    it('should calculate normal pointing from A to B (horizontal)', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact!.normal.x).toBeCloseTo(1, 10);
      expect(contact!.normal.y).toBeCloseTo(0, 10);
    });

    it('should calculate normal pointing from A to B (vertical)', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 0, y: 15 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact!.normal.x).toBeCloseTo(0, 10);
      expect(contact!.normal.y).toBeCloseTo(1, 10);
    });

    it('should calculate normal pointing from A to B (diagonal)', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 10, y: 10 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      // Normal should be unit vector pointing to (10, 10)
      const expectedNormal = {
        x: 1 / Math.sqrt(2),
        y: 1 / Math.sqrt(2)
      };
      expect(contact!.normal.x).toBeCloseTo(expectedNormal.x, 10);
      expect(contact!.normal.y).toBeCloseTo(expectedNormal.y, 10);
    });

    it('should always be unit length', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 12, y: 9 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      const length = Math.sqrt(
        contact!.normal.x ** 2 + contact!.normal.y ** 2
      );
      expect(length).toBeCloseTo(1, 10);
    });

    it('should reverse when bodies are swapped', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10
      });

      const contactAB = detectCircleCircle(circleA, circleB);
      const contactBA = detectCircleCircle(circleB, circleA);

      // Normals should point in opposite directions
      expect(contactAB!.normal.x).toBeCloseTo(-contactBA!.normal.x, 10);
      expect(contactAB!.normal.y).toBeCloseTo(-contactBA!.normal.y, 10);
    });
  });

  describe('contact point', () => {
    it('should be on surface of circle A', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      // Contact point should be at (10, 0) - on surface of A
      expect(contact!.point.x).toBeCloseTo(10, 10);
      expect(contact!.point.y).toBeCloseTo(0, 10);
    });

    it('should be between the two circles', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      // Point should be between x=0 and x=15
      expect(contact!.point.x).toBeGreaterThan(circleA.position.x);
      expect(contact!.point.x).toBeLessThan(circleB.position.x);
    });

    it('should be at correct position for diagonal collision', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 10, y: 10 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      // Contact point should be 10 units from origin at 45 degrees
      const dist = Math.sqrt(contact!.point.x ** 2 + contact!.point.y ** 2);
      expect(dist).toBeCloseTo(10, 10);
      expect(contact!.point.x).toBeCloseTo(contact!.point.y, 10);
    });
  });

  describe('symmetry', () => {
    it('should have same depth regardless of order', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10
      });

      const contactAB = detectCircleCircle(circleA, circleB);
      const contactBA = detectCircleCircle(circleB, circleA);

      expect(contactAB!.depth).toBeCloseTo(contactBA!.depth, 10);
    });
  });

  describe('edge cases', () => {
    it('should handle very small circles', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 0.1
      });
      const circleB = createCircle({
        position: { x: 0.15, y: 0 },
        radius: 0.1
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact).not.toBeNull();
      expect(contact!.depth).toBeCloseTo(0.05, 10);
    });

    it('should handle very large circles', () => {
      const circleA = createCircle({
        position: { x: 0, y: 0 },
        radius: 1000
      });
      const circleB = createCircle({
        position: { x: 1500, y: 0 },
        radius: 1000
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact).not.toBeNull();
      expect(contact!.depth).toBeCloseTo(500, 10);
    });

    it('should handle negative coordinates', () => {
      const circleA = createCircle({
        position: { x: -10, y: -10 },
        radius: 10
      });
      const circleB = createCircle({
        position: { x: -5, y: -10 },
        radius: 10
      });

      const contact = detectCircleCircle(circleA, circleB);

      expect(contact).not.toBeNull();
      expect(contact!.depth).toBeCloseTo(15, 10);
    });
  });
});

