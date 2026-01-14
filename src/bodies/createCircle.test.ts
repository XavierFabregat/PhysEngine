import { describe, it, expect, beforeEach } from 'vitest';
import { createCircle, resetBodyIdCounter } from './createCircle';
import { BodyType } from '../types/BodyType';
import { DEFAULT_MATERIAL } from '../types/Material';

describe('createCircle', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('basic creation', () => {
    it('should create circle with minimal config', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.shape.type).toBe('circle');
      expect(circle.shape.radius).toBe(10);
      expect(circle.type).toBe(BodyType.DYNAMIC);
      expect(circle.position).toEqual({ x: 0, y: 0 });
    });

    it('should create circle with custom position', () => {
      const circle = createCircle({
        radius: 10,
        position: { x: 100, y: 200 },
      });
      
      expect(circle.position.x).toBe(100);
      expect(circle.position.y).toBe(200);
    });

    it('should create circle with custom radius', () => {
      const circle = createCircle({ radius: 25 });
      
      expect(circle.shape.radius).toBe(25);
    });

    it('should generate unique IDs', () => {
      const circle1 = createCircle({ radius: 10 });
      const circle2 = createCircle({ radius: 10 });
      const circle3 = createCircle({ radius: 10 });
      
      expect(circle1.id).toBe('body_0');
      expect(circle2.id).toBe('body_1');
      expect(circle3.id).toBe('body_2');
    });
  });

  describe('body type', () => {
    it('should create dynamic body by default', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.type).toBe(BodyType.DYNAMIC);
    });

    it('should create static body when specified', () => {
      const circle = createCircle({
        radius: 10,
        type: BodyType.STATIC,
      });
      
      expect(circle.type).toBe(BodyType.STATIC);
    });

    it('should create kinematic body when specified', () => {
      const circle = createCircle({
        radius: 10,
        type: BodyType.KINEMATIC,
      });
      
      expect(circle.type).toBe(BodyType.KINEMATIC);
    });
  });

  describe('mass properties - dynamic', () => {
    it('should calculate mass from radius and default density', () => {
      const radius = 10;
      const circle = createCircle({ radius });
      
      const expectedMass = Math.PI * radius * radius * DEFAULT_MATERIAL.density;
      expect(circle.mass).toBeCloseTo(expectedMass, 10);
    });

    it('should calculate mass with custom density', () => {
      const radius = 5;
      const density = 2000;
      const circle = createCircle({
        radius,
        material: { density },
      });
      
      const expectedMass = Math.PI * radius * radius * density;
      expect(circle.mass).toBeCloseTo(expectedMass, 10);
    });

    it('should calculate invMass correctly', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.invMass).toBeCloseTo(1 / circle.mass, 10);
    });

    it('should calculate inertia correctly', () => {
      const radius = 10;
      const circle = createCircle({ radius });
      
      const expectedInertia = 0.5 * circle.mass * radius * radius;
      expect(circle.inertia).toBeCloseTo(expectedInertia, 10);
    });

    it('should calculate invInertia correctly', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.invInertia).toBeCloseTo(1 / circle.inertia, 10);
    });
  });

  describe('mass properties - static', () => {
    it('should have infinite mass for static body', () => {
      const circle = createCircle({
        radius: 10,
        type: BodyType.STATIC,
      });
      
      expect(circle.mass).toBe(Infinity);
      expect(circle.invMass).toBe(0);
    });

    it('should have infinite inertia for static body', () => {
      const circle = createCircle({
        radius: 10,
        type: BodyType.STATIC,
      });
      
      expect(circle.inertia).toBe(Infinity);
      expect(circle.invInertia).toBe(0);
    });
  });

  describe('mass properties - kinematic', () => {
    it('should have infinite mass for kinematic body', () => {
      const circle = createCircle({
        radius: 10,
        type: BodyType.KINEMATIC,
      });
      
      expect(circle.mass).toBe(Infinity);
      expect(circle.invMass).toBe(0);
    });

    it('should have infinite inertia for kinematic body', () => {
      const circle = createCircle({
        radius: 10,
        type: BodyType.KINEMATIC,
      });
      
      expect(circle.inertia).toBe(Infinity);
      expect(circle.invInertia).toBe(0);
    });
  });

  describe('material', () => {
    it('should use default material when not specified', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.material.friction).toBe(DEFAULT_MATERIAL.friction);
      expect(circle.material.restitution).toBe(DEFAULT_MATERIAL.restitution);
      expect(circle.material.density).toBe(DEFAULT_MATERIAL.density);
    });

    it('should override specific material properties', () => {
      const circle = createCircle({
        radius: 10,
        material: { friction: 0.8 },
      });
      
      expect(circle.material.friction).toBe(0.8);
      expect(circle.material.restitution).toBe(DEFAULT_MATERIAL.restitution);
      expect(circle.material.density).toBe(DEFAULT_MATERIAL.density);
    });

    it('should allow full material customization', () => {
      const circle = createCircle({
        radius: 10,
        material: {
          friction: 0.1,
          restitution: 0.95,
          density: 500,
        },
      });
      
      expect(circle.material.friction).toBe(0.1);
      expect(circle.material.restitution).toBe(0.95);
      expect(circle.material.density).toBe(500);
    });
  });

  describe('motion state', () => {
    it('should initialize with zero velocity by default', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.velocity).toEqual({ x: 0, y: 0 });
      expect(circle.angularVelocity).toBe(0);
    });

    it('should allow custom initial velocity', () => {
      const circle = createCircle({
        radius: 10,
        velocity: { x: 50, y: -30 },
      });
      
      expect(circle.velocity.x).toBe(50);
      expect(circle.velocity.y).toBe(-30);
    });

    it('should allow custom initial angular velocity', () => {
      const circle = createCircle({
        radius: 10,
        angularVelocity: Math.PI,
      });
      
      expect(circle.angularVelocity).toBe(Math.PI);
    });

    it('should initialize forces and torque to zero', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.force).toEqual({ x: 0, y: 0 });
      expect(circle.torque).toBe(0);
    });

    it('should allow custom initial rotation', () => {
      const circle = createCircle({
        radius: 10,
        rotation: Math.PI / 4,
      });
      
      expect(circle.rotation).toBe(Math.PI / 4);
    });

    it('should default rotation to zero', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.rotation).toBe(0);
    });
  });

  describe('AABB', () => {
    it('should create correct AABB at origin', () => {
      const circle = createCircle({
        radius: 10,
        position: { x: 0, y: 0 },
      });
      
      expect(circle.aabb.min.x).toBe(-10);
      expect(circle.aabb.min.y).toBe(-10);
      expect(circle.aabb.max.x).toBe(10);
      expect(circle.aabb.max.y).toBe(10);
    });

    it('should create correct AABB at custom position', () => {
      const circle = createCircle({
        radius: 20,
        position: { x: 100, y: 200 },
      });
      
      expect(circle.aabb.min.x).toBe(80);
      expect(circle.aabb.min.y).toBe(180);
      expect(circle.aabb.max.x).toBe(120);
      expect(circle.aabb.max.y).toBe(220);
    });

    it('should create AABB that contains the circle', () => {
      const circle = createCircle({
        radius: 15,
        position: { x: 50, y: 75 },
      });
      
      // Center should be inside AABB
      expect(circle.aabb.min.x).toBeLessThan(circle.position.x);
      expect(circle.aabb.max.x).toBeGreaterThan(circle.position.x);
      expect(circle.aabb.min.y).toBeLessThan(circle.position.y);
      expect(circle.aabb.max.y).toBeGreaterThan(circle.position.y);
      
      // AABB should be exactly 2*radius wide and tall
      const width = circle.aabb.max.x - circle.aabb.min.x;
      const height = circle.aabb.max.y - circle.aabb.min.y;
      expect(width).toBeCloseTo(2 * circle.shape.radius, 10);
      expect(height).toBeCloseTo(2 * circle.shape.radius, 10);
    });
  });

  describe('collision filtering', () => {
    it('should use default layer and collidesWith', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.layer).toBe(1);
      expect(circle.collidesWith).toBe(0xffffffff);
    });

    it('should allow custom layer', () => {
      const circle = createCircle({
        radius: 10,
        layer: 1 << 2, // Layer 3
      });
      
      expect(circle.layer).toBe(4);
    });

    it('should allow custom collidesWith mask', () => {
      const circle = createCircle({
        radius: 10,
        collidesWith: (1 << 0) | (1 << 1), // Layers 1 and 2
      });
      
      expect(circle.collidesWith).toBe(3);
    });

    it('should not be a sensor by default', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.isSensor).toBe(false);
    });

    it('should allow creating sensor', () => {
      const circle = createCircle({
        radius: 10,
        isSensor: true,
      });
      
      expect(circle.isSensor).toBe(true);
    });
  });

  describe('state flags', () => {
    it('should be awake by default', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.isAwake).toBe(true);
    });

    it('should not be bullet by default', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.isBullet).toBe(false);
    });

    it('should allow creating bullet body', () => {
      const circle = createCircle({
        radius: 5,
        isBullet: true,
      });
      
      expect(circle.isBullet).toBe(true);
    });
  });

  describe('userData', () => {
    it('should be undefined by default', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.userData).toBeUndefined();
    });

    it('should allow storing custom data', () => {
      const userData = { spriteId: 'player-ball', score: 100 };
      const circle = createCircle({
        radius: 10,
        userData,
      });
      
      expect(circle.userData).toBe(userData);
    });

    it('should allow any type of user data', () => {
      const circle1 = createCircle({ radius: 10, userData: 'string' });
      const circle2 = createCircle({ radius: 10, userData: 42 });
      const circle3 = createCircle({ radius: 10, userData: { complex: true } });
      
      expect(circle1.userData).toBe('string');
      expect(circle2.userData).toBe(42);
      expect(circle3.userData).toEqual({ complex: true });
    });
  });

  describe('edge cases', () => {
    it('should handle very small radius', () => {
      const circle = createCircle({ radius: 0.001 });
      
      expect(circle.shape.radius).toBe(0.001);
      expect(circle.mass).toBeGreaterThan(0);
      expect(circle.invMass).toBeGreaterThan(0);
    });

    it('should handle very large radius', () => {
      const circle = createCircle({ radius: 10000 });
      
      expect(circle.shape.radius).toBe(10000);
      expect(circle.mass).toBeGreaterThan(0);
      expect(circle.invMass).toBeGreaterThan(0);
    });

    it('should handle negative position', () => {
      const circle = createCircle({
        radius: 10,
        position: { x: -100, y: -200 },
      });
      
      expect(circle.position.x).toBe(-100);
      expect(circle.position.y).toBe(-200);
      expect(circle.aabb.min.x).toBe(-110);
      expect(circle.aabb.min.y).toBe(-210);
    });

    it('should handle extreme velocity', () => {
      const circle = createCircle({
        radius: 10,
        velocity: { x: 1000, y: -1000 },
      });
      
      expect(circle.velocity.x).toBe(1000);
      expect(circle.velocity.y).toBe(-1000);
    });
  });

  describe('complete configuration', () => {
    it('should create fully configured circle', () => {
      const circle = createCircle({
        radius: 25,
        position: { x: 100, y: 200 },
        type: BodyType.DYNAMIC,
        material: {
          friction: 0.5,
          restitution: 0.7,
          density: 800,
        },
        velocity: { x: 10, y: -5 },
        angularVelocity: 0.5,
        rotation: Math.PI / 6,
        layer: 1 << 1,
        collidesWith: (1 << 0) | (1 << 2),
        isSensor: false,
        isBullet: true,
        userData: { type: 'ball' },
      });
      
      expect(circle.shape.radius).toBe(25);
      expect(circle.position).toEqual({ x: 100, y: 200 });
      expect(circle.type).toBe(BodyType.DYNAMIC);
      expect(circle.material.friction).toBe(0.5);
      expect(circle.material.restitution).toBe(0.7);
      expect(circle.material.density).toBe(800);
      expect(circle.velocity).toEqual({ x: 10, y: -5 });
      expect(circle.angularVelocity).toBe(0.5);
      expect(circle.rotation).toBe(Math.PI / 6);
      expect(circle.layer).toBe(2);
      expect(circle.collidesWith).toBe(5);
      expect(circle.isSensor).toBe(false);
      expect(circle.isBullet).toBe(true);
      expect(circle.userData).toEqual({ type: 'ball' });
    });
  });

  describe('consistency checks', () => {
    it('should have consistent mass and invMass for dynamic body', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.mass * circle.invMass).toBeCloseTo(1, 10);
    });

    it('should have consistent inertia and invInertia for dynamic body', () => {
      const circle = createCircle({ radius: 10 });
      
      expect(circle.inertia * circle.invInertia).toBeCloseTo(1, 10);
    });

    it('should have zero invMass and invInertia for static body', () => {
      const circle = createCircle({
        radius: 10,
        type: BodyType.STATIC,
      });
      
      expect(circle.invMass).toBe(0);
      expect(circle.invInertia).toBe(0);
      expect(circle.mass).toBe(Infinity);
      expect(circle.inertia).toBe(Infinity);
    });

    it('should have AABB centered at body position', () => {
      const position = { x: 100, y: 200 };
      const radius = 15;
      const circle = createCircle({ position, radius });
      
      const aabbCenter = {
        x: (circle.aabb.min.x + circle.aabb.max.x) / 2,
        y: (circle.aabb.min.y + circle.aabb.max.y) / 2,
      };
      
      expect(aabbCenter.x).toBeCloseTo(position.x, 10);
      expect(aabbCenter.y).toBeCloseTo(position.y, 10);
    });
  });
});

