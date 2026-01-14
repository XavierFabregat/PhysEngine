import { describe, it, expect } from 'vitest';
import { isStatic, isDynamic, isKinematic, shouldCollide } from './Body';
import type { Body } from './Body';
import { BodyType } from './BodyType';

// Helper to create minimal test body
const createTestBody = (overrides: Partial<Body> = {}): Body => ({
  id: 'test-body',
  type: BodyType.DYNAMIC,
  position: { x: 0, y: 0 },
  rotation: 0,
  velocity: { x: 0, y: 0 },
  angularVelocity: 0,
  force: { x: 0, y: 0 },
  torque: 0,
  mass: 1,
  invMass: 1,
  inertia: 1,
  invInertia: 1,
  material: { friction: 0.3, restitution: 0.2, density: 1000 },
  shape: { type: 'circle', radius: 10 },
  aabb: { min: { x: -10, y: -10 }, max: { x: 10, y: 10 } },
  layer: 1,
  collidesWith: 1,
  isSensor: false,
  isAwake: true,
  isBullet: false,
  ...overrides,
});

describe('Body', () => {
  describe('isStatic', () => {
    it('should return true for static body', () => {
      const body = createTestBody({ type: BodyType.STATIC });
      expect(isStatic(body)).toBe(true);
    });

    it('should return false for dynamic body', () => {
      const body = createTestBody({ type: BodyType.DYNAMIC });
      expect(isStatic(body)).toBe(false);
    });

    it('should return false for kinematic body', () => {
      const body = createTestBody({ type: BodyType.KINEMATIC });
      expect(isStatic(body)).toBe(false);
    });
  });

  describe('isDynamic', () => {
    it('should return true for dynamic body', () => {
      const body = createTestBody({ type: BodyType.DYNAMIC });
      expect(isDynamic(body)).toBe(true);
    });

    it('should return false for static body', () => {
      const body = createTestBody({ type: BodyType.STATIC });
      expect(isDynamic(body)).toBe(false);
    });

    it('should return false for kinematic body', () => {
      const body = createTestBody({ type: BodyType.KINEMATIC });
      expect(isDynamic(body)).toBe(false);
    });
  });

  describe('isKinematic', () => {
    it('should return true for kinematic body', () => {
      const body = createTestBody({ type: BodyType.KINEMATIC });
      expect(isKinematic(body)).toBe(true);
    });

    it('should return false for static body', () => {
      const body = createTestBody({ type: BodyType.STATIC });
      expect(isKinematic(body)).toBe(false);
    });

    it('should return false for dynamic body', () => {
      const body = createTestBody({ type: BodyType.DYNAMIC });
      expect(isKinematic(body)).toBe(false);
    });
  });

  describe('shouldCollide', () => {
    // Define some common layers using bit flags
    const LAYER_WORLD = 1 << 0; // 0001 = 1
    const LAYER_PLAYER = 1 << 1; // 0010 = 2
    const LAYER_ENEMY = 1 << 2; // 0100 = 4
    const LAYER_BULLET = 1 << 3; // 1000 = 8

    it('should return true when both bodies are on same layer and collide with that layer', () => {
      const bodyA = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: LAYER_PLAYER,
      });
      const bodyB = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: LAYER_PLAYER,
      });
      expect(shouldCollide(bodyA, bodyB)).toBe(true);
    });

    it('should return true when layers match collision masks', () => {
      const player = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: LAYER_WORLD | LAYER_ENEMY, // Collides with world and enemies
      });
      const enemy = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: LAYER_PLAYER | LAYER_WORLD, // Collides with player and world
      });
      expect(shouldCollide(player, enemy)).toBe(true);
    });

    it('should return false when bodyA layer not in bodyB collidesWith', () => {
      const player = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: LAYER_WORLD,
      });
      const enemy = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: LAYER_WORLD, // Enemy doesn't collide with player
      });
      expect(shouldCollide(player, enemy)).toBe(false);
    });

    it('should return false when bodyB layer not in bodyA collidesWith', () => {
      const player = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: LAYER_WORLD, // Player doesn't collide with enemy
      });
      const enemy = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: LAYER_PLAYER,
      });
      expect(shouldCollide(player, enemy)).toBe(false);
    });

    it('should be bidirectional (both directions must pass)', () => {
      const bodyA = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: LAYER_ENEMY,
      });
      const bodyB = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: LAYER_PLAYER,
      });
      expect(shouldCollide(bodyA, bodyB)).toBe(true);
      expect(shouldCollide(bodyB, bodyA)).toBe(true);
    });

    it('should handle multiple layers in collision mask', () => {
      const bullet = createTestBody({
        layer: LAYER_BULLET,
        collidesWith: LAYER_WORLD | LAYER_ENEMY, // Bullet hits world and enemies
      });
      const enemy = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: LAYER_BULLET | LAYER_PLAYER,
      });
      expect(shouldCollide(bullet, enemy)).toBe(true);
    });

    it('should return false when no layer overlap', () => {
      const bodyA = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: LAYER_WORLD,
      });
      const bodyB = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: LAYER_WORLD,
      });
      expect(shouldCollide(bodyA, bodyB)).toBe(false);
    });

    it('should return true if bodyA is a sensor', () => {
      const sensor = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: 0, // Doesn't collide with anything normally
        isSensor: true,
      });
      const body = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: 0,
      });
      expect(shouldCollide(sensor, body)).toBe(true);
    });

    it('should return true if bodyB is a sensor', () => {
      const body = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: 0,
      });
      const sensor = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: 0,
        isSensor: true,
      });
      expect(shouldCollide(body, sensor)).toBe(true);
    });

    it('should return true if both are sensors', () => {
      const sensorA = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: 0,
        isSensor: true,
      });
      const sensorB = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: 0,
        isSensor: true,
      });
      expect(shouldCollide(sensorA, sensorB)).toBe(true);
    });

    it('should handle collision with all layers (bitmask all 1s)', () => {
      const bodyA = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: 0xffffffff, // Collides with everything
      });
      const bodyB = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: LAYER_PLAYER,
      });
      expect(shouldCollide(bodyA, bodyB)).toBe(true);
    });

    it('should handle collision with no layers (bitmask all 0s)', () => {
      const bodyA = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: 0, // Collides with nothing
        isSensor: false,
      });
      const bodyB = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: LAYER_PLAYER,
      });
      expect(shouldCollide(bodyA, bodyB)).toBe(false);
    });

    it('should handle complex multi-layer scenarios', () => {
      // Player bullet that doesn't hit other players
      const playerBullet = createTestBody({
        layer: LAYER_BULLET,
        collidesWith: LAYER_WORLD | LAYER_ENEMY, // Not LAYER_PLAYER
      });
      const player = createTestBody({
        layer: LAYER_PLAYER,
        collidesWith: LAYER_WORLD | LAYER_ENEMY,
      });
      const enemy = createTestBody({
        layer: LAYER_ENEMY,
        collidesWith: LAYER_WORLD | LAYER_PLAYER | LAYER_BULLET,
      });

      // Bullet should hit enemy
      expect(shouldCollide(playerBullet, enemy)).toBe(true);
      // Bullet should not hit player (even though player would hit bullet)
      expect(shouldCollide(playerBullet, player)).toBe(false);
    });
  });
});

