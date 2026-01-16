import { describe, it, expect } from 'vitest';
import { isCircle, isRectangle, isPolygon } from './Shape';
import type { Shape, CircleShape, RectangleShape, PolygonShape } from './Shape';

describe('Shape', () => {
  describe('isCircle', () => {
    it('should return true for circle shape', () => {
      const circle: CircleShape = {
        type: 'circle',
        radius: 25,
      };
      expect(isCircle(circle)).toBe(true);
    });

    it('should return false for rectangle shape', () => {
      const rectangle: RectangleShape = {
        type: 'rectangle',
        width: 50,
        height: 30,
        vertices: [
          { x: -25, y: -15 },
          { x: 25, y: -15 },
          { x: 25, y: 15 },
          { x: -25, y: 15 },
        ],
      };
      expect(isCircle(rectangle)).toBe(false);
    });

    it('should return false for polygon shape', () => {
      const polygon: PolygonShape = {
        type: 'polygon',
        vertices: [
          { x: 0, y: -10 },
          { x: 10, y: 10 },
          { x: -10, y: 10 },
        ],
      };
      expect(isCircle(polygon)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const shape: Shape = {
        type: 'circle',
        radius: 10,
      };

      if (isCircle(shape)) {
        // TypeScript should know this is CircleShape
        expect(shape.radius).toBe(10);
        // @ts-expect-error - width doesn't exist on CircleShape
        const _ = shape.width;
      }
    });
  });

  describe('isRectangle', () => {
    it('should return true for rectangle shape', () => {
      const rectangle: RectangleShape = {
        type: 'rectangle',
        width: 50,
        height: 30,
        vertices: [
          { x: -25, y: -15 },
          { x: 25, y: -15 },
          { x: 25, y: 15 },
          { x: -25, y: 15 },
        ],
      };
      expect(isRectangle(rectangle)).toBe(true);
    });

    it('should return false for circle shape', () => {
      const circle: CircleShape = {
        type: 'circle',
        radius: 25,
      };
      expect(isRectangle(circle)).toBe(false);
    });

    it('should return false for polygon shape', () => {
      const polygon: PolygonShape = {
        type: 'polygon',
        vertices: [
          { x: 0, y: -10 },
          { x: 10, y: 10 },
          { x: -10, y: 10 },
        ],
      };
      expect(isRectangle(polygon)).toBe(false);
    });
  });

  describe('isPolygon', () => {
    it('should return true for polygon shape', () => {
      const polygon: PolygonShape = {
        type: 'polygon',
        vertices: [
          { x: 0, y: -10 },
          { x: 10, y: 10 },
          { x: -10, y: 10 },
        ],
      };
      expect(isPolygon(polygon)).toBe(true);
    });

    it('should return false for circle shape', () => {
      const circle: CircleShape = {
        type: 'circle',
        radius: 25,
      };
      expect(isPolygon(circle)).toBe(false);
    });

    it('should return false for rectangle shape', () => {
      const rectangle: RectangleShape = {
        type: 'rectangle',
        width: 50,
        height: 30,
        vertices: [
          { x: -25, y: -15 },
          { x: 25, y: -15 },
          { x: 25, y: 15 },
          { x: -25, y: 15 },
        ],
      };
      expect(isPolygon(rectangle)).toBe(false);
    });
  });
});

