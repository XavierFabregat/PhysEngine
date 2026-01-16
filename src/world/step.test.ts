import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from './createWorld';
import { step } from './step';
import { addBody } from './body';
import { createCircle, resetBodyIdCounter } from '../bodies/createCircle';
import { createRectangle } from '../bodies/createRectangle';
import { BodyType } from '../types/BodyType';

describe('step', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('basic stepping', () => {
    it('should increment world time', () => {
      const world = createWorld();
      
      expect(world.time).toBe(0);
      
      step(world, 1/60);
      expect(world.time).toBeCloseTo(1/60, 10);
      
      step(world, 1/60);
      expect(world.time).toBeCloseTo(2/60, 10);
    });

    it('should handle variable time steps', () => {
      const world = createWorld();
      
      step(world, 0.1);
      step(world, 0.05);
      step(world, 0.02);
      
      expect(world.time).toBeCloseTo(0.17, 10);
    });

    it('should do nothing for empty world', () => {
      const world = createWorld();
      
      step(world, 1/60);
      
      expect(world.bodies.length).toBe(0);
      expect(world.time).toBeCloseTo(1/60, 10);
    });
  });

  describe('integration', () => {
    it('should integrate dynamic bodies', () => {
      const world = createWorld({ gravity: { x: 0, y: 100 } });
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        velocity: { x: 0, y: 0 },
      });
      
      addBody(world, body);
      
      step(world, 1);
      
      // After 1 second with gravity 100:
      // Velocity should be ~100, position should be ~100
      expect(body.velocity.y).toBeGreaterThan(90);
      expect(body.position.y).toBeGreaterThan(90);
    });

    it('should not move static bodies', () => {
      const world = createWorld({ gravity: { x: 0, y: 400 } });
      const body = createCircle({
        position: { x: 100, y: 200 },
        radius: 20,
        type: BodyType.STATIC,
      });
      
      addBody(world, body);
      
      step(world, 1/60);
      
      expect(body.position).toEqual({ x: 100, y: 200 });
      expect(body.velocity).toEqual({ x: 0, y: 0 });
    });

    it('should move multiple bodies independently', () => {
      const world = createWorld({ gravity: { x: 0, y: 100 } });
      
      const body1 = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        velocity: { x: 10, y: 0 },
      });
      
      const body2 = createCircle({
        position: { x: 100, y: 100 },
        radius: 30,
        velocity: { x: -5, y: 5 },
      });
      
      addBody(world, body1);
      addBody(world, body2);
      
      step(world, 1);
      
      // Bodies should move independently
      expect(body1.position.x).toBeGreaterThan(0);
      expect(body2.position.x).toBeLessThan(100);
    });
  });

  describe('AABB updates', () => {
    it('should update circle AABB after movement', () => {
      const world = createWorld();
      const body = createCircle({
        position: { x: 100, y: 100 },
        radius: 20,
        velocity: { x: 10, y: 5 },
      });
      
      addBody(world, body);
      
      step(world, 1);
      
      // AABB should follow the new position
      const aabbCenter = {
        x: (body.aabb.min.x + body.aabb.max.x) / 2,
        y: (body.aabb.min.y + body.aabb.max.y) / 2,
      };
      
      expect(aabbCenter.x).toBeCloseTo(body.position.x, 10);
      expect(aabbCenter.y).toBeCloseTo(body.position.y, 10);
    });

    it('should update rectangle AABB for non-rotated rectangle', () => {
      const world = createWorld();
      const body = createRectangle({
        position: { x: 100, y: 100 },
        width: 40,
        height: 20,
        rotation: 0,
        velocity: { x: 10, y: 5 },
      });
      
      addBody(world, body);
      
      step(world, 1);
      
      // AABB should be tight-fitting for axis-aligned rectangle
      const width = body.aabb.max.x - body.aabb.min.x;
      const height = body.aabb.max.y - body.aabb.min.y;
      
      expect(width).toBeCloseTo(40, 10);
      expect(height).toBeCloseTo(20, 10);
    });

    it('should update rectangle AABB after rotation', () => {
      const world = createWorld();
      const body = createRectangle({
        position: { x: 100, y: 100 },
        width: 40,
        height: 20,
        rotation: 0,
        angularVelocity: Math.PI / 2, // 90 degrees per second
        velocity: { x: 10, y: 5 },
      });
      
      addBody(world, body);
      
      step(world, 1);
      
      // After rotation, AABB should still be centered at body position
      const aabbCenter = {
        x: (body.aabb.min.x + body.aabb.max.x) / 2,
        y: (body.aabb.min.y + body.aabb.max.y) / 2,
      };
      
      expect(aabbCenter.x).toBeCloseTo(body.position.x, 5);
      expect(aabbCenter.y).toBeCloseTo(body.position.y, 5);
      
      // AABB should be updated for rotation
      expect(body.rotation).not.toBe(0);
    });

    it('should handle AABB for 45-degree rotated rectangle', () => {
      const world = createWorld();
      const body = createRectangle({
        position: { x: 0, y: 0 },
        width: 40,
        height: 20,
        rotation: Math.PI / 4, // Start rotated
        velocity: { x: 10, y: 0 },
      });
      
      addBody(world, body);
      
      step(world, 1);
      
      // AABB should contain all rotated vertices
      // At 45 degrees, AABB is larger than axis-aligned
      const width = body.aabb.max.x - body.aabb.min.x;
      const height = body.aabb.max.y - body.aabb.min.y;
      
      expect(width).toBeGreaterThan(40);
      expect(height).toBeGreaterThan(20);
    });

    it('should update AABB for rectangle as it rotates', () => {
      const world = createWorld();
      const body = createRectangle({
        position: { x: 0, y: 0 },
        width: 40,
        height: 20,
        rotation: 0,
        angularVelocity: Math.PI / 4, // 45 degrees per second
        velocity: { x: 0, y: 0 },
      });
      
      addBody(world, body);
      
      // At rotation 0, AABB is 40x20
      const aabb0Width = body.aabb.max.x - body.aabb.min.x;
      expect(aabb0Width).toBeCloseTo(40, 10);
      
      // Rotate to 45 degrees
      step(world, 1);
      const aabb45Width = body.aabb.max.x - body.aabb.min.x;
      
      // At 45 degrees, AABB should be larger
      expect(aabb45Width).toBeGreaterThan(40);
      expect(body.rotation).toBeCloseTo(Math.PI / 4, 10);
    });

    it('should update AABB for polygon shapes', () => {
      const world = createWorld();
      
      // Manually create a polygon body for testing
      // (We don't have createPolygon factory yet, so construct manually)
      const polygon = {
        id: 'test-polygon',
        type: 'dynamic' as const,
        position: { x: 100, y: 100 },
        rotation: 0,
        velocity: { x: 10, y: 5 },
        angularVelocity: 0.5,
        force: { x: 0, y: 0 },
        torque: 0,
        mass: 100,
        invMass: 0.01,
        inertia: 100,
        invInertia: 0.01,
        material: { friction: 0.3, restitution: 0.2, density: 1000 },
        shape: {
          type: 'polygon' as const,
          vertices: [
            { x: 0, y: -10 },
            { x: 10, y: 10 },
            { x: -10, y: 10 },
          ]
        },
        aabb: { min: { x: 90, y: 90 }, max: { x: 110, y: 110 } },
        layer: 1,
        collidesWith: 0xffffffff,
        isSensor: false,
        isAwake: true,
        isBullet: false,
      };
      
      addBody(world, polygon);
      
      const initialPosition = { ...polygon.position };
      
      step(world, 1);
      
      // Position should have moved
      expect(polygon.position.x).toBeGreaterThan(initialPosition.x);
      expect(polygon.position.y).toBeGreaterThan(initialPosition.y);
      
      // AABB should be updated to follow body
      const aabbCenter = {
        x: (polygon.aabb.min.x + polygon.aabb.max.x) / 2,
        y: (polygon.aabb.min.y + polygon.aabb.max.y) / 2,
      };
      
      // AABB center should be close to body position
      expect(Math.abs(aabbCenter.x - polygon.position.x)).toBeLessThan(15);
      expect(Math.abs(aabbCenter.y - polygon.position.y)).toBeLessThan(15);
    });
  });

  describe('realistic scenarios', () => {
    it('should simulate falling ball', () => {
      const world = createWorld({ gravity: { x: 0, y: 400 } });
      const ball = createCircle({
        position: { x: 100, y: 50 },
        radius: 20,
      });
      
      addBody(world, ball);
      
      // Simulate 60 frames (1 second)
      for (let i = 0; i < 60; i++) {
        step(world, 1/60);
      }
      
      // Ball should have fallen
      expect(ball.position.y).toBeGreaterThan(50);
      expect(ball.velocity.y).toBeGreaterThan(0);
    });

    it('should simulate projectile motion', () => {
      const world = createWorld({ gravity: { x: 0, y: 100 } });
      const projectile = createCircle({
        position: { x: 0, y: 0 },
        radius: 5,
        velocity: { x: 100, y: -50 }, // Launch at angle
      });
      
      addBody(world, projectile);
      
      step(world, 1);
      
      // Horizontal velocity unchanged (no friction yet)
      expect(projectile.velocity.x).toBeCloseTo(100, 5);
      
      // Vertical velocity affected by gravity
      expect(projectile.velocity.y).toBeGreaterThan(-50);
      
      // Should have moved both horizontally and vertically
      expect(projectile.position.x).toBeGreaterThan(0);
    });
  });
});

