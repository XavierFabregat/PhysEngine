import { describe, it, expect } from 'vitest';
import {
  calculateCircleMass,
  calculateCircleInertia,
  calculateRectangleMass,
  calculateRectangleInertia,
  calculatePolygonArea,
  calculatePolygonMass,
  calculatePolygonInertia,
  calculatePolygonCentroid,
  isCounterClockwise,
  isConvex,
} from './utils';

describe('Circle Mass & Inertia', () => {
  describe('calculateCircleMass', () => {
    it('should calculate mass for unit circle with unit density', () => {
      const mass = calculateCircleMass(1, 1);
      expect(mass).toBeCloseTo(Math.PI, 10);
    });

    it('should calculate mass for circle with radius 10 and density 1000', () => {
      const mass = calculateCircleMass(10, 1000);
      expect(mass).toBeCloseTo(Math.PI * 100 * 1000, 10);
    });

    it('should scale linearly with density', () => {
      const mass1 = calculateCircleMass(5, 100);
      const mass2 = calculateCircleMass(5, 200);
      expect(mass2).toBeCloseTo(mass1 * 2, 10);
    });

    it('should scale quadratically with radius', () => {
      const mass1 = calculateCircleMass(5, 100);
      const mass2 = calculateCircleMass(10, 100);
      expect(mass2).toBeCloseTo(mass1 * 4, 10); // (10/5)² = 4
    });

    it('should return zero for zero radius', () => {
      const mass = calculateCircleMass(0, 1000);
      expect(mass).toBe(0);
    });
  });

  describe('calculateCircleInertia', () => {
    it('should calculate inertia for unit mass and radius', () => {
      const inertia = calculateCircleInertia(1, 1);
      expect(inertia).toBe(0.5);
    });

    it('should calculate inertia for known values', () => {
      const mass = 10;
      const radius = 5;
      const inertia = calculateCircleInertia(mass, radius);
      expect(inertia).toBeCloseTo(0.5 * 10 * 25, 10); // 125
    });

    it('should scale linearly with mass', () => {
      const inertia1 = calculateCircleInertia(10, 5);
      const inertia2 = calculateCircleInertia(20, 5);
      expect(inertia2).toBeCloseTo(inertia1 * 2, 10);
    });

    it('should scale quadratically with radius', () => {
      const inertia1 = calculateCircleInertia(10, 5);
      const inertia2 = calculateCircleInertia(10, 10);
      expect(inertia2).toBeCloseTo(inertia1 * 4, 10);
    });

    it('should return zero for zero mass', () => {
      const inertia = calculateCircleInertia(0, 10);
      expect(inertia).toBe(0);
    });

    it('should return zero for zero radius', () => {
      const inertia = calculateCircleInertia(10, 0);
      expect(inertia).toBe(0);
    });
  });
});

describe('Rectangle Mass & Inertia', () => {
  describe('calculateRectangleMass', () => {
    it('should calculate mass for unit square with unit density', () => {
      const mass = calculateRectangleMass(1, 1, 1);
      expect(mass).toBe(1);
    });

    it('should calculate mass for 10x20 rectangle with density 1000', () => {
      const mass = calculateRectangleMass(10, 20, 1000);
      expect(mass).toBe(200000); // 10 * 20 * 1000
    });

    it('should scale linearly with width', () => {
      const mass1 = calculateRectangleMass(5, 10, 100);
      const mass2 = calculateRectangleMass(10, 10, 100);
      expect(mass2).toBeCloseTo(mass1 * 2, 10);
    });

    it('should scale linearly with height', () => {
      const mass1 = calculateRectangleMass(10, 5, 100);
      const mass2 = calculateRectangleMass(10, 10, 100);
      expect(mass2).toBeCloseTo(mass1 * 2, 10);
    });

    it('should return zero for zero width', () => {
      const mass = calculateRectangleMass(0, 10, 1000);
      expect(mass).toBe(0);
    });

    it('should return zero for zero height', () => {
      const mass = calculateRectangleMass(10, 0, 1000);
      expect(mass).toBe(0);
    });
  });

  describe('calculateRectangleInertia', () => {
    it('should calculate inertia for unit square with unit mass', () => {
      const inertia = calculateRectangleInertia(1, 1, 1);
      expect(inertia).toBeCloseTo(1 / 6, 10); // (1/12) * 1 * (1 + 1) = 1/6
    });

    it('should calculate inertia for square (width === height)', () => {
      const mass = 12;
      const side = 10;
      const inertia = calculateRectangleInertia(mass, side, side);
      expect(inertia).toBeCloseTo((12 / 12) * (100 + 100), 10); // 200
    });

    it('should calculate inertia for rectangle', () => {
      const mass = 12;
      const width = 6;
      const height = 8;
      const inertia = calculateRectangleInertia(mass, width, height);
      expect(inertia).toBeCloseTo((12 / 12) * (36 + 64), 10); // 100
    });

    it('should scale linearly with mass', () => {
      const inertia1 = calculateRectangleInertia(10, 5, 5);
      const inertia2 = calculateRectangleInertia(20, 5, 5);
      expect(inertia2).toBeCloseTo(inertia1 * 2, 10);
    });

    it('should return zero for zero mass', () => {
      const inertia = calculateRectangleInertia(0, 10, 10);
      expect(inertia).toBe(0);
    });
  });
});

describe('Polygon Area, Mass & Inertia', () => {
  describe('calculatePolygonArea', () => {
    it('should return 0 for less than 3 vertices', () => {
      expect(calculatePolygonArea([])).toBe(0);
      expect(calculatePolygonArea([{ x: 0, y: 0 }])).toBe(0);
      expect(calculatePolygonArea([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ])).toBe(0);
    });

    it('should calculate area of unit square (CCW)', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const area = calculatePolygonArea(vertices);
      expect(area).toBeCloseTo(1, 10);
    });

    it('should return negative area for clockwise vertices', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
      ];
      const area = calculatePolygonArea(vertices);
      expect(area).toBeCloseTo(-1, 10);
    });

    it('should calculate area of triangle', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 3 },
      ];
      const area = calculatePolygonArea(vertices);
      expect(area).toBeCloseTo(6, 10); // 0.5 * 4 * 3 = 6
    });

    it('should calculate area of pentagon', () => {
      const vertices = [
        { x: 0, y: -10 },
        { x: 9.51, y: -3.09 },
        { x: 5.88, y: 8.09 },
        { x: -5.88, y: 8.09 },
        { x: -9.51, y: -3.09 },
      ];
      const area = Math.abs(calculatePolygonArea(vertices));
      expect(area).toBeCloseTo(237.77, 2); // Regular pentagon with radius ~10
    });

    it('should handle vertices centered at non-origin', () => {
      const vertices = [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 20 },
        { x: 10, y: 20 },
      ];
      const area = calculatePolygonArea(vertices);
      expect(area).toBeCloseTo(100, 10);
    });
  });

  describe('calculatePolygonMass', () => {
    it('should calculate mass using absolute area', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      const mass = calculatePolygonMass(vertices, 1000);
      expect(mass).toBeCloseTo(100 * 1000, 10);
    });

    it('should work for both CW and CCW vertices', () => {
      const ccw = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      const cw = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
      ];
      const massCCW = calculatePolygonMass(ccw, 1000);
      const massCW = calculatePolygonMass(cw, 1000);
      expect(massCCW).toBeCloseTo(massCW, 10);
    });

    it('should return zero for degenerate polygon', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];
      const mass = calculatePolygonMass(vertices, 1000);
      expect(mass).toBe(0);
    });
  });

  describe('calculatePolygonCentroid', () => {
    it('should return origin for empty or degenerate polygon', () => {
      expect(calculatePolygonCentroid([])).toEqual({ x: 0, y: 0 });
      expect(calculatePolygonCentroid([{ x: 5, y: 5 }])).toEqual({ x: 0, y: 0 });
    });

    it('should calculate centroid of square centered at origin', () => {
      const vertices = [
        { x: -5, y: -5 },
        { x: 5, y: -5 },
        { x: 5, y: 5 },
        { x: -5, y: 5 },
      ];
      const centroid = calculatePolygonCentroid(vertices);
      expect(centroid.x).toBeCloseTo(0, 10);
      expect(centroid.y).toBeCloseTo(0, 10);
    });

    it('should calculate centroid of square not at origin', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      const centroid = calculatePolygonCentroid(vertices);
      expect(centroid.x).toBeCloseTo(5, 10);
      expect(centroid.y).toBeCloseTo(5, 10);
    });

    it('should calculate centroid of triangle', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 0, y: 6 },
      ];
      const centroid = calculatePolygonCentroid(vertices);
      expect(centroid.x).toBeCloseTo(2, 10);
      expect(centroid.y).toBeCloseTo(2, 10);
    });

    it('should work with negative coordinates', () => {
      const vertices = [
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: 10 },
        { x: -10, y: 10 },
      ];
      const centroid = calculatePolygonCentroid(vertices);
      expect(centroid.x).toBeCloseTo(0, 10);
      expect(centroid.y).toBeCloseTo(0, 10);
    });
  });
});

describe('Polygon Validation', () => {
  describe('isCounterClockwise', () => {
    it('should return true for CCW square', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      expect(isCounterClockwise(vertices)).toBe(true);
    });

    it('should return false for CW square', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
      ];
      expect(isCounterClockwise(vertices)).toBe(false);
    });

    it('should return true for CCW triangle', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];
      expect(isCounterClockwise(vertices)).toBe(true);
    });

    it('should return false for CW triangle', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 5, y: 10 },
        { x: 10, y: 0 },
      ];
      expect(isCounterClockwise(vertices)).toBe(false);
    });
  });

  describe('isConvex', () => {
    it('should return false for less than 3 vertices', () => {
      expect(isConvex([])).toBe(false);
      expect(isConvex([{ x: 0, y: 0 }])).toBe(false);
      expect(isConvex([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ])).toBe(false);
    });

    it('should return true for convex square', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      expect(isConvex(vertices)).toBe(true);
    });

    it('should return true for convex triangle', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];
      expect(isConvex(vertices)).toBe(true);
    });

    it('should return true for convex pentagon', () => {
      const vertices = [
        { x: 0, y: -10 },
        { x: 9.51, y: -3.09 },
        { x: 5.88, y: 8.09 },
        { x: -5.88, y: 8.09 },
        { x: -9.51, y: -3.09 },
      ];
      expect(isConvex(vertices)).toBe(true);
    });

    it('should return false for concave polygon (arrow shape)', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 5, y: 5 }, // Indent creates concavity
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      expect(isConvex(vertices)).toBe(false);
    });

    it('should return false for concave polygon (L-shape)', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
        { x: 5, y: 5 }, // Corner indent
        { x: 5, y: 10 },
        { x: 0, y: 10 },
      ];
      expect(isConvex(vertices)).toBe(false);
    });

    it('should handle vertices in clockwise order', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
      ];
      // Should still detect convexity regardless of winding
      expect(isConvex(vertices)).toBe(true);
    });
  });
});

describe('Integration Tests - Mass and Inertia Consistency', () => {
  it('should have consistent mass and inertia for circle', () => {
    const radius = 10;
    const density = 1000;
    const mass = calculateCircleMass(radius, density);
    const inertia = calculateCircleInertia(mass, radius);

    // Inertia should be 0.5 * mass * radius²
    expect(inertia).toBeCloseTo(0.5 * mass * radius * radius, 10);
  });

  it('should have consistent mass and inertia for rectangle', () => {
    const width = 20;
    const height = 10;
    const density = 1000;
    const mass = calculateRectangleMass(width, height, density);
    const inertia = calculateRectangleInertia(mass, width, height);

    // Inertia should be (1/12) * mass * (w² + h²)
    expect(inertia).toBeCloseTo((mass / 12) * (width * width + height * height), 10);
  });

  it('should have consistent mass and inertia for polygon (square as polygon)', () => {
    const vertices = [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
      { x: -5, y: 5 },
    ];
    const density = 1000;
    const mass = calculatePolygonMass(vertices, density);

    // Should match rectangle calculation
    const expectedMass = calculateRectangleMass(10, 10, density);
    expect(mass).toBeCloseTo(expectedMass, 10);
  });
});

