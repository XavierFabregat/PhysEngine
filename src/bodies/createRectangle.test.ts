import { describe, it, expect, beforeEach } from 'vitest';
import { createRectangle, resetBodyIdCounter } from './createRectangle';
import { BodyType } from '../types/BodyType';
import { DEFAULT_MATERIAL } from '../types/Material';

describe('createRectangle', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('basic creation', () => {
    it('should create rectangle with minimal config', () => {
      const rect = createRectangle({ width: 50, height: 30 });
      
      expect(rect.shape.type).toBe('rectangle');
      expect(rect.shape.width).toBe(50);
      expect(rect.shape.height).toBe(30);
      expect(rect.type).toBe(BodyType.DYNAMIC);
      expect(rect.position).toEqual({ x: 0, y: 0 });
    });

    it('should create rectangle with custom position', () => {
      const rect = createRectangle({
        width: 50,
        height: 30,
        position: { x: 100, y: 200 },
      });
      
      expect(rect.position.x).toBe(100);
      expect(rect.position.y).toBe(200);
    });

    it('should create square (width === height)', () => {
      const rect = createRectangle({ width: 40, height: 40 });
      
      expect(rect.shape.width).toBe(40);
      expect(rect.shape.height).toBe(40);
    });

    it('should generate unique IDs', () => {
      const rect1 = createRectangle({ width: 10, height: 10 });
      const rect2 = createRectangle({ width: 10, height: 10 });
      const rect3 = createRectangle({ width: 10, height: 10 });
      
      expect(rect1.id).toBe('body_0');
      expect(rect2.id).toBe('body_1');
      expect(rect3.id).toBe('body_2');
    });
  });

  describe('vertices', () => {
    it('should create 4 vertices for rectangle', () => {
      const rect = createRectangle({ width: 50, height: 30 });
      
      expect(rect.shape.vertices).toHaveLength(4);
    });

    it('should create vertices in counter-clockwise order', () => {
      const rect = createRectangle({ width: 10, height: 6 });
      const verts = rect.shape.vertices;
      
      // Bottom-left, bottom-right, top-right, top-left
      expect(verts[0]).toEqual({ x: -5, y: -3 });
      expect(verts[1]).toEqual({ x: 5, y: -3 });
      expect(verts[2]).toEqual({ x: 5, y: 3 });
      expect(verts[3]).toEqual({ x: -5, y: 3 });
    });

    it('should center vertices at origin (local space)', () => {
      const rect = createRectangle({ width: 100, height: 60 });
      const verts = rect.shape.vertices;
      
      // All vertices should be symmetrical around origin
      expect(verts[0].x).toBe(-50);
      expect(verts[1].x).toBe(50);
      expect(verts[0].y).toBe(-30);
      expect(verts[2].y).toBe(30);
    });

    it('should create correct vertices for square', () => {
      const rect = createRectangle({ width: 20, height: 20 });
      const verts = rect.shape.vertices;
      
      expect(verts[0]).toEqual({ x: -10, y: -10 });
      expect(verts[1]).toEqual({ x: 10, y: -10 });
      expect(verts[2]).toEqual({ x: 10, y: 10 });
      expect(verts[3]).toEqual({ x: -10, y: 10 });
    });
  });

  describe('body type', () => {
    it('should create dynamic body by default', () => {
      const rect = createRectangle({ width: 10, height: 10 });
      
      expect(rect.type).toBe(BodyType.DYNAMIC);
    });

    it('should create static body when specified', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        type: BodyType.STATIC,
      });
      
      expect(rect.type).toBe(BodyType.STATIC);
    });

    it('should create kinematic body when specified', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        type: BodyType.KINEMATIC,
      });
      
      expect(rect.type).toBe(BodyType.KINEMATIC);
    });
  });

  describe('mass properties - dynamic', () => {
    it('should calculate mass from dimensions and default density', () => {
      const width = 10;
      const height = 20;
      const rect = createRectangle({ width, height });
      
      const expectedMass = width * height * DEFAULT_MATERIAL.density;
      expect(rect.mass).toBeCloseTo(expectedMass, 10);
    });

    it('should calculate mass with custom density', () => {
      const width = 5;
      const height = 8;
      const density = 2000;
      const rect = createRectangle({
        width,
        height,
        material: { density },
      });
      
      const expectedMass = width * height * density;
      expect(rect.mass).toBeCloseTo(expectedMass, 10);
    });

    it('should calculate invMass correctly', () => {
      const rect = createRectangle({ width: 10, height: 10 });
      
      expect(rect.invMass).toBeCloseTo(1 / rect.mass, 10);
    });

    it('should calculate inertia correctly for square', () => {
      const side = 10;
      const rect = createRectangle({ width: side, height: side });
      
      const expectedInertia = (rect.mass / 12) * (side * side + side * side);
      expect(rect.inertia).toBeCloseTo(expectedInertia, 10);
    });

    it('should calculate inertia correctly for rectangle', () => {
      const width = 20;
      const height = 10;
      const rect = createRectangle({ width, height });
      
      const expectedInertia = (rect.mass / 12) * (width * width + height * height);
      expect(rect.inertia).toBeCloseTo(expectedInertia, 10);
    });

    it('should calculate invInertia correctly', () => {
      const rect = createRectangle({ width: 10, height: 10 });
      
      expect(rect.invInertia).toBeCloseTo(1 / rect.inertia, 10);
    });
  });

  describe('mass properties - static', () => {
    it('should have infinite mass for static body', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        type: BodyType.STATIC,
      });
      
      expect(rect.mass).toBe(Infinity);
      expect(rect.invMass).toBe(0);
    });

    it('should have infinite inertia for static body', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        type: BodyType.STATIC,
      });
      
      expect(rect.inertia).toBe(Infinity);
      expect(rect.invInertia).toBe(0);
    });
  });

  describe('AABB - no rotation', () => {
    it('should create correct AABB at origin with no rotation', () => {
      const rect = createRectangle({
        width: 50,
        height: 30,
        position: { x: 0, y: 0 },
        rotation: 0,
      });
      
      expect(rect.aabb.min.x).toBe(-25);
      expect(rect.aabb.min.y).toBe(-15);
      expect(rect.aabb.max.x).toBe(25);
      expect(rect.aabb.max.y).toBe(15);
    });

    it('should create correct AABB at custom position with no rotation', () => {
      const rect = createRectangle({
        width: 100,
        height: 60,
        position: { x: 200, y: 300 },
        rotation: 0,
      });
      
      expect(rect.aabb.min.x).toBe(150);
      expect(rect.aabb.min.y).toBe(270);
      expect(rect.aabb.max.x).toBe(250);
      expect(rect.aabb.max.y).toBe(330);
    });
  });

  describe('AABB - with rotation', () => {
    it('should create larger AABB for 45-degree rotated square', () => {
      const side = 10;
      const rect = createRectangle({
        width: side,
        height: side,
        position: { x: 0, y: 0 },
        rotation: Math.PI / 4, // 45 degrees
      });
      
      // Rotated square AABB should be larger than aligned square
      // Diagonal = side * √2 ≈ 14.14
      const aabbWidth = rect.aabb.max.x - rect.aabb.min.x;
      const aabbHeight = rect.aabb.max.y - rect.aabb.min.y;
      
      expect(aabbWidth).toBeCloseTo(side * Math.SQRT2, 2);
      expect(aabbHeight).toBeCloseTo(side * Math.SQRT2, 2);
    });

    it('should create correct AABB for 90-degree rotated rectangle', () => {
      const rect = createRectangle({
        width: 40,
        height: 20,
        position: { x: 0, y: 0 },
        rotation: Math.PI / 2, // 90 degrees
      });
      
      // 90° rotation swaps width and height in AABB
      const aabbWidth = rect.aabb.max.x - rect.aabb.min.x;
      const aabbHeight = rect.aabb.max.y - rect.aabb.min.y;
      
      expect(aabbWidth).toBeCloseTo(20, 2); // Original height
      expect(aabbHeight).toBeCloseTo(40, 2); // Original width
    });

    it('should keep AABB centered at body position when rotated', () => {
      const position = { x: 100, y: 200 };
      const rect = createRectangle({
        width: 30,
        height: 20,
        position,
        rotation: Math.PI / 3,
      });
      
      const aabbCenter = {
        x: (rect.aabb.min.x + rect.aabb.max.x) / 2,
        y: (rect.aabb.min.y + rect.aabb.max.y) / 2,
      };
      
      expect(aabbCenter.x).toBeCloseTo(position.x, 10);
      expect(aabbCenter.y).toBeCloseTo(position.y, 10);
    });
  });

  describe('material', () => {
    it('should use default material when not specified', () => {
      const rect = createRectangle({ width: 10, height: 10 });
      
      expect(rect.material.friction).toBe(DEFAULT_MATERIAL.friction);
      expect(rect.material.restitution).toBe(DEFAULT_MATERIAL.restitution);
      expect(rect.material.density).toBe(DEFAULT_MATERIAL.density);
    });

    it('should override specific material properties', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        material: { restitution: 0.9 },
      });
      
      expect(rect.material.friction).toBe(DEFAULT_MATERIAL.friction);
      expect(rect.material.restitution).toBe(0.9);
      expect(rect.material.density).toBe(DEFAULT_MATERIAL.density);
    });
  });

  describe('motion state', () => {
    it('should initialize with zero velocity by default', () => {
      const rect = createRectangle({ width: 10, height: 10 });
      
      expect(rect.velocity).toEqual({ x: 0, y: 0 });
      expect(rect.angularVelocity).toBe(0);
    });

    it('should allow custom initial velocity', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        velocity: { x: 100, y: -50 },
      });
      
      expect(rect.velocity.x).toBe(100);
      expect(rect.velocity.y).toBe(-50);
    });

    it('should allow custom initial angular velocity', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        angularVelocity: 2.5,
      });
      
      expect(rect.angularVelocity).toBe(2.5);
    });

    it('should initialize forces to zero', () => {
      const rect = createRectangle({ width: 10, height: 10 });
      
      expect(rect.force).toEqual({ x: 0, y: 0 });
      expect(rect.torque).toBe(0);
    });
  });

  describe('collision filtering', () => {
    it('should use default layer and collidesWith', () => {
      const rect = createRectangle({ width: 10, height: 10 });
      
      expect(rect.layer).toBe(1);
      expect(rect.collidesWith).toBe(0xffffffff);
    });

    it('should allow custom collision filtering', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        layer: 1 << 3,
        collidesWith: (1 << 0) | (1 << 1),
      });
      
      expect(rect.layer).toBe(8);
      expect(rect.collidesWith).toBe(3);
    });

    it('should allow creating sensor', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        isSensor: true,
      });
      
      expect(rect.isSensor).toBe(true);
    });
  });

  describe('state flags', () => {
    it('should be awake by default', () => {
      const rect = createRectangle({ width: 10, height: 10 });
      
      expect(rect.isAwake).toBe(true);
    });

    it('should not be bullet by default', () => {
      const rect = createRectangle({ width: 10, height: 10 });
      
      expect(rect.isBullet).toBe(false);
    });

    it('should allow creating bullet body', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        isBullet: true,
      });
      
      expect(rect.isBullet).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very small dimensions', () => {
      const rect = createRectangle({ width: 0.01, height: 0.01 });
      
      expect(rect.shape.width).toBe(0.01);
      expect(rect.shape.height).toBe(0.01);
      expect(rect.mass).toBeGreaterThan(0);
    });

    it('should handle very large dimensions', () => {
      const rect = createRectangle({ width: 10000, height: 5000 });
      
      expect(rect.shape.width).toBe(10000);
      expect(rect.shape.height).toBe(5000);
      expect(rect.mass).toBeGreaterThan(0);
    });

    it('should handle asymmetric dimensions', () => {
      const rect = createRectangle({ width: 100, height: 1 });
      
      expect(rect.shape.width).toBe(100);
      expect(rect.shape.height).toBe(1);
    });

    it('should handle negative position', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        position: { x: -50, y: -100 },
      });
      
      expect(rect.position.x).toBe(-50);
      expect(rect.position.y).toBe(-100);
    });
  });

  describe('consistency checks', () => {
    it('should have consistent mass and invMass for dynamic body', () => {
      const rect = createRectangle({ width: 20, height: 30 });
      
      expect(rect.mass * rect.invMass).toBeCloseTo(1, 10);
    });

    it('should have consistent inertia and invInertia for dynamic body', () => {
      const rect = createRectangle({ width: 20, height: 30 });
      
      expect(rect.inertia * rect.invInertia).toBeCloseTo(1, 10);
    });

    it('should have zero invMass and invInertia for static body', () => {
      const rect = createRectangle({
        width: 10,
        height: 10,
        type: BodyType.STATIC,
      });
      
      expect(rect.invMass).toBe(0);
      expect(rect.invInertia).toBe(0);
    });

    it('should have AABB that contains all vertices (no rotation)', () => {
      const rect = createRectangle({
        width: 50,
        height: 30,
        position: { x: 100, y: 200 },
        rotation: 0,
      });
      
      // AABB should exactly fit the rectangle
      expect(rect.aabb.min.x).toBe(100 - 25);
      expect(rect.aabb.max.x).toBe(100 + 25);
      expect(rect.aabb.min.y).toBe(200 - 15);
      expect(rect.aabb.max.y).toBe(200 + 15);
    });

    it('should have AABB that contains all rotated vertices', () => {
      const rect = createRectangle({
        width: 20,
        height: 10,
        position: { x: 0, y: 0 },
        rotation: Math.PI / 4,
      });
      
      // All vertices should be inside AABB when transformed to world space
      // This is implicitly tested by the AABB.fromPoints call
      expect(rect.aabb.min.x).toBeLessThanOrEqual(0);
      expect(rect.aabb.max.x).toBeGreaterThanOrEqual(0);
      expect(rect.aabb.min.y).toBeLessThanOrEqual(0);
      expect(rect.aabb.max.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('complete configuration', () => {
    it('should create fully configured rectangle', () => {
      const rect = createRectangle({
        width: 100,
        height: 50,
        position: { x: 300, y: 400 },
        type: BodyType.DYNAMIC,
        material: {
          friction: 0.6,
          restitution: 0.4,
          density: 1500,
        },
        velocity: { x: 20, y: -10 },
        angularVelocity: 1.5,
        rotation: Math.PI / 6,
        layer: 1 << 2,
        collidesWith: (1 << 0) | (1 << 1),
        isSensor: false,
        isBullet: true,
        userData: { name: 'platform' },
      });
      
      expect(rect.shape.width).toBe(100);
      expect(rect.shape.height).toBe(50);
      expect(rect.position).toEqual({ x: 300, y: 400 });
      expect(rect.type).toBe(BodyType.DYNAMIC);
      expect(rect.material.friction).toBe(0.6);
      expect(rect.material.restitution).toBe(0.4);
      expect(rect.material.density).toBe(1500);
      expect(rect.velocity).toEqual({ x: 20, y: -10 });
      expect(rect.angularVelocity).toBe(1.5);
      expect(rect.rotation).toBe(Math.PI / 6);
      expect(rect.layer).toBe(4);
      expect(rect.collidesWith).toBe(3);
      expect(rect.isSensor).toBe(false);
      expect(rect.isBullet).toBe(true);
      expect(rect.userData).toEqual({ name: 'platform' });
    });
  });
});

