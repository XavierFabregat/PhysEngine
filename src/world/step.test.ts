import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from './createWorld';
import { step } from './step';
import { addBody } from './body';
import { createCircle, resetBodyIdCounter } from '../bodies/createCircle';
import { createRectangle } from '../bodies/createRectangle';
import { BodyType } from '../types/BodyType';
import { ImpulseResolver } from '../systems/resolvers/ImpulseResolver';

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

    it('should reject NaN, infinite or negative dt', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      addBody(world, body);

      for (const dt of [NaN, Infinity, -1 / 60]) {
        expect(() => step(world, dt)).toThrow(RangeError);
      }
      expect(body.position).toEqual({ x: 0, y: 0 });
      expect(world.time).toBe(0);
    });

    it('should accept dt = 0', () => {
      const world = createWorld();
      step(world, 0);
      expect(world.time).toBe(0);
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

  describe('collision detection and response', () => {
    it('should land a falling ball on a static rectangle floor', () => {
      const world = createWorld({ gravity: { x: 0, y: 400 } });
      const floor = createRectangle({
        position: { x: 400, y: 580 },
        width: 800,
        height: 40,
        type: BodyType.STATIC,
      });
      const ball = createCircle({
        position: { x: 400, y: 100 },
        radius: 20,
        material: { restitution: 0 },
      });
      addBody(world, floor);
      addBody(world, ball);

      for (let i = 0; i < 240; i++) step(world, 1 / 60);

      // Floor top at y = 560: the ball rests on it (small penetration allowed)
      expect(ball.position.y).toBeGreaterThan(560 - 20 - 0.5);
      expect(ball.position.y).toBeLessThan(560 - 20 + 2);
      expect(Math.abs(ball.velocity.y)).toBeLessThan(10);
    });

    it('should lose bounce height by about e² per floor bounce, never gain it', () => {
      const apexRatios = (restitution: number) => {
        const world = createWorld({ gravity: { x: 0, y: 400 } });
        addBody(world, createRectangle({
          position: { x: 0, y: 580 },
          width: 800,
          height: 40,
          type: BodyType.STATIC,
          material: { restitution: 1 },
        }));
        const ball = createCircle({ position: { x: 0, y: 100 }, radius: 20, material: { restitution } });
        addBody(world, ball);

        const heights = [540 - 100];
        let previousVy = 0;
        for (let i = 0; i < 60 * 20 && heights.length < 4; i++) {
          step(world, 1 / 60);
          if (previousVy < 0 && ball.velocity.y >= 0) heights.push(540 - ball.position.y);
          previousVy = ball.velocity.y;
        }
        return heights.slice(1).map((h, i) => h / heights[i]!);
      };

      for (const ratio of apexRatios(1)) {
        expect(ratio).toBeLessThanOrEqual(1);
        expect(ratio).toBeGreaterThan(0.95);
      }
      for (const ratio of apexRatios(0.8)) {
        expect(ratio).toBeGreaterThan(0.58);
        expect(ratio).toBeLessThan(0.66); // e² = 0.64
      }
    });

    it('should honour the resolver restitution rule set through createWorld', () => {
      const firstBounceHeight = (restitutionCombine: 'min' | 'max') => {
        const world = createWorld({
          gravity: { x: 0, y: 400 },
          resolver: new ImpulseResolver({ restitutionCombine }),
        });
        // Default floor material: restitution 0.2
        addBody(world, createRectangle({ position: { x: 0, y: 580 }, width: 800, height: 40, type: BodyType.STATIC }));
        const ball = createCircle({ position: { x: 0, y: 100 }, radius: 20, material: { restitution: 1 } });
        addBody(world, ball);

        let previousVy = 0;
        for (let i = 0; i < 600; i++) {
          step(world, 1 / 60);
          if (previousVy < 0 && ball.velocity.y >= 0) return 540 - ball.position.y;
          previousVy = ball.velocity.y;
        }
        return 0;
      };

      // Dropped from 440 px above the resting height
      expect(firstBounceHeight('min')).toBeLessThan(440 * 0.2 ** 2 * 1.1); // e = 0.2
      expect(firstBounceHeight('max')).toBeGreaterThan(440 * 0.95); // e = 1
    });

    it('should bounce off a rectangle with the lower restitution of the pair', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      const wall = createRectangle({
        position: { x: 100, y: 0 },
        width: 20,
        height: 200,
        type: BodyType.STATIC,
        material: { restitution: 0.5 },
      });
      const ball = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 120, y: 0 },
        material: { restitution: 0.9 },
      });
      addBody(world, wall);
      addBody(world, ball);

      for (let i = 0; i < 60; i++) step(world, 1 / 60);

      expect(ball.velocity.x).toBeCloseTo(-60, 5);
      expect(ball.position.x).toBeLessThan(80);
    });

    it('should slide a ball down a frictionless rotated ramp', () => {
      const world = createWorld({ gravity: { x: 0, y: 400 } });
      const angle = Math.PI / 6; // right side lower on a y-down screen
      const ramp = createRectangle({
        position: { x: 0, y: 0 },
        width: 400,
        height: 20,
        rotation: angle,
        type: BodyType.STATIC,
      });
      // Start resting on the ramp's upper surface, left of centre
      const up = { x: Math.sin(angle), y: -Math.cos(angle) };
      const along = { x: Math.cos(angle), y: Math.sin(angle) };
      const start = { x: -100 * along.x + 20 * up.x, y: -100 * along.y + 20 * up.y };
      const ball = createCircle({ position: start, radius: 10, material: { restitution: 0 } });
      addBody(world, ramp);
      addBody(world, ball);

      for (let i = 0; i < 30; i++) step(world, 1 / 60);

      const travelled = (ball.position.x - start.x) * along.x + (ball.position.y - start.y) * along.y;
      const heightAboveSurface = (ball.position.x) * up.x + (ball.position.y) * up.y;
      // No friction: acceleration along the slope is g·sin(30°) = 200 → ~25 px in 0.5 s
      expect(travelled).toBeGreaterThan(20);
      expect(travelled).toBeLessThan(35);
      // Still on the surface (radius 10 + half thickness 10)
      expect(heightAboveSurface).toBeGreaterThan(19);
      expect(heightAboveSurface).toBeLessThan(21);
    });

    it('should let a kinematic rectangle platform lift a resting ball', () => {
      const world = createWorld({ gravity: { x: 0, y: 400 } });
      const platform = createRectangle({
        position: { x: 0, y: 200 },
        width: 200,
        height: 20,
        type: BodyType.KINEMATIC,
        velocity: { x: 0, y: -50 },
      });
      const ball = createCircle({ position: { x: 0, y: 180 }, radius: 10, material: { restitution: 0 } });
      addBody(world, platform);
      addBody(world, ball);

      for (let i = 0; i < 60; i++) step(world, 1 / 60);

      // Platform top rose from 190 to 140; ball rides on it
      expect(platform.position.y).toBeCloseTo(150, 5);
      expect(ball.position.y).toBeGreaterThan(130 - 1);
      expect(ball.position.y).toBeLessThan(130 + 2);
    });

    it('should use a custom narrow phase from the world config', () => {
      const calls: string[] = [];
      const world = createWorld({
        gravity: { x: 0, y: 0 },
        narrowPhase: {
          detect: (a, b) => {
            calls.push(`${a.id}|${b.id}`);
            return null;
          },
        },
      });
      const a = createCircle({ radius: 10 });
      const b = createCircle({ position: { x: 5, y: 0 }, radius: 10 });
      addBody(world, a);
      addBody(world, b);

      step(world, 1 / 60);

      expect(calls).toEqual([`${a.id}|${b.id}`]);
    });

    it('should keep kinematic, static and later dynamic bodies finite after a kinematic touches a static peg', () => {
      // Regression: kinematic-vs-static contacts produced 0/0 impulses, turning
      // both velocities into NaN; the poisoned peg then NaN'd any ball landing on it.
      const world = createWorld({ gravity: { x: 0, y: 400 } });
      const peg = createCircle({ position: { x: 0, y: 100 }, radius: 10, type: BodyType.STATIC });
      const sweeper = createCircle({
        position: { x: -30, y: 100 },
        radius: 5,
        type: BodyType.KINEMATIC,
        velocity: { x: 60, y: 0 },
      });
      addBody(world, peg);
      addBody(world, sweeper);

      for (let i = 0; i < 30; i++) step(world, 1 / 60);

      expect(peg.velocity).toEqual({ x: 0, y: 0 });
      expect(sweeper.velocity).toEqual({ x: 60, y: 0 });
      expect(sweeper.position.x).toBeCloseTo(0, 10); // passes through the peg unaffected

      const ball = createCircle({ position: { x: 0, y: 40 }, radius: 8 });
      addBody(world, ball);
      for (let i = 0; i < 60; i++) step(world, 1 / 60);

      expect(Number.isFinite(ball.position.x)).toBe(true);
      expect(Number.isFinite(ball.position.y)).toBe(true);
      expect(ball.position.y).toBeLessThan(100); // resting on top of the peg, not NaN or through it
    });

    it('should call broad phase and execute collision loop', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      
      // Create stationary overlapping circles
      const ballA = createCircle({
        position: { x: 0, y: 0 },
        radius: 15,
        velocity: { x: 0, y: 0 }
      });
      const ballB = createCircle({
        position: { x: 20, y: 0 },  // Distance 20, sum of radii 30 - overlapping
        radius: 15,
        velocity: { x: 0, y: 0 }
      });
      
      addBody(world, ballA);
      addBody(world, ballB);
      
      // Verify world has the collision systems
      expect(world.broadPhase).toBeDefined();
      expect(world.resolver).toBeDefined();
      
      const posBeforeA = ballA.position.x;
      const posBeforeB = ballB.position.x;
      
      step(world, 1/60);
      
      // Collision should be detected and resolved - bodies pushed apart
      expect(ballA.position.x).toBeLessThan(posBeforeA);
      expect(ballB.position.x).toBeGreaterThan(posBeforeB);
    });

    it('should execute collision detection loop', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      
      // Explicitly overlapping circles to ensure broad phase detects them
      const ballA = createCircle({
        position: { x: 100, y: 100 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });
      const ballB = createCircle({
        position: { x: 115, y: 100 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });
      
      addBody(world, ballA);
      addBody(world, ballB);
      
      // Verify they're overlapping before step
      const distBefore = Math.abs(ballB.position.x - ballA.position.x);
      expect(distBefore).toBe(15);  // Less than sum of radii (20)
      
      step(world, 1/60);
      
      // After step, they should be pushed apart
      const distAfter = Math.abs(ballB.position.x - ballA.position.x);
      expect(distAfter).toBeGreaterThan(distBefore);
    });

    it('should detect and resolve circle-circle collisions', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      
      const ballA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 }
      });
      const ballB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: -10, y: 0 }
      });
      
      addBody(world, ballA);
      addBody(world, ballB);
      
      step(world, 1/60);
      
      // Velocities should change after collision
      expect(ballA.velocity.x).not.toBe(10);
      expect(ballB.velocity.x).not.toBe(-10);
    });

    it('should separate overlapping bodies', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      
      const ballA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });
      const ballB = createCircle({
        position: { x: 15, y: 0 },  // Overlapping (should be 20 apart)
        radius: 10,
        velocity: { x: 0, y: 0 }
      });
      
      addBody(world, ballA);
      addBody(world, ballB);
      
      const origDistance = Math.abs(ballB.position.x - ballA.position.x);
      
      step(world, 1/60);
      
      const newDistance = Math.abs(ballB.position.x - ballA.position.x);
      
      // Bodies should be pushed apart
      expect(newDistance).toBeGreaterThan(origDistance);
    });

    it('should handle multiple collisions in one step', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      
      // Three balls in a row, all overlapping
      const ball1 = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });
      const ball2 = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });
      const ball3 = createCircle({
        position: { x: 30, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });
      
      addBody(world, ball1);
      addBody(world, ball2);
      addBody(world, ball3);
      
      // Should not crash with multiple collisions
      expect(() => step(world, 1/60)).not.toThrow();
      
      // All should be moved apart
      const dist12 = Math.abs(ball2.position.x - ball1.position.x);
      const dist23 = Math.abs(ball3.position.x - ball2.position.x);
      
      expect(dist12).toBeGreaterThan(15);
      expect(dist23).toBeGreaterThan(15);
    });

    it('should bounce ball off static wall', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      
      const ball = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 100, y: 0 },
        material: { restitution: 1.0 }
      });
      const wall = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        type: BodyType.STATIC
      });
      
      addBody(world, ball);
      addBody(world, wall);
      
      step(world, 1/60);
      
      // Ball should bounce back (velocity reverses)
      expect(ball.velocity.x).toBeLessThan(0);
      
      // Wall shouldn't move
      expect(wall.position.x).toBe(15);
      expect(wall.velocity.x).toBe(0);
    });

    it('should not collide bodies on different layers', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      
      const LAYER_A = 1 << 0;
      const LAYER_B = 1 << 1;
      
      const ballA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 },
        layer: LAYER_A,
        collidesWith: LAYER_A
      });
      const ballB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: -10, y: 0 },
        layer: LAYER_B,
        collidesWith: LAYER_B
      });
      
      addBody(world, ballA);
      addBody(world, ballB);
      
      step(world, 1/60);
      
      // Velocities shouldn't change (different layers)
      expect(ballA.velocity.x).toBeCloseTo(10, 5);
      expect(ballB.velocity.x).toBeCloseTo(-10, 5);
    });

    it('should handle sensors without physical response', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      
      const sensor = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 },
        isSensor: true
      });
      const ball = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: -10, y: 0 }
      });
      
      addBody(world, sensor);
      addBody(world, ball);
      
      const origVel = { ...ball.velocity };
      
      step(world, 1/60);
      
      // Sensor detected but no physical response
      // Ball velocity should continue mostly unchanged
      expect(ball.velocity.x).toBeCloseTo(origVel.x, 1);
    });

    it('should handle broad phase false positives (overlapping AABBs, no collision)', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      
      // Circle and rectangle with overlapping AABBs but not actually colliding
      // This forces broad phase to detect them but narrow phase to reject
      const circle = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 }
      });
      const rect = createRectangle({
        position: { x: 30, y: 30 },  // Diagonal - AABBs overlap but shapes don't
        width: 20,
        height: 20,
        velocity: { x: -10, y: 0 }
      });
      
      addBody(world, circle);
      addBody(world, rect);
      
      step(world, 1/60);
      
      // Broad phase detects AABB overlap, but narrow phase (circle-circle only) returns null
      // Velocities should be unchanged since narrow phase doesn't support circle-rect yet
      expect(circle.velocity.x).toBeCloseTo(10, 5);
      expect(rect.velocity.x).toBeCloseTo(-10, 5);
    });
  });
});

