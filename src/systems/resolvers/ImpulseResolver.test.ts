import { describe, it, expect, beforeEach } from 'vitest';
import { ImpulseResolver } from './ImpulseResolver';
import { createCircle, resetBodyIdCounter } from '../../bodies/createCircle';
import { BodyType } from '../../types/BodyType';
import type { Contact } from '../../types/Contact.js';
import { createRectangle } from '../../bodies/createRectangle';
import * as Vec2 from '../../core/Vector2';

describe('ImpulseResolver', () => {
  let resolver: ImpulseResolver;

  beforeEach(() => {
    resolver = new ImpulseResolver();
    resetBodyIdCounter();
  });

  describe('position correction', () => {
    it('should separate overlapping dynamic bodies', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });
      const bodyB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5  // Overlapping by 5 units
      };

      const origPosA = { ...bodyA.position };
      const origPosB = { ...bodyB.position };

      resolver.resolve(bodyA, bodyB, contact);

      // Bodies should move apart
      expect(bodyA.position.x).toBeLessThan(origPosA.x);
      expect(bodyB.position.x).toBeGreaterThan(origPosB.x);
    });

    it('should not move static bodies during position correction', () => {
      const staticBody = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        type: BodyType.STATIC
      });
      const dynamicBody = createCircle({
        position: { x: 15, y: 0 },
        radius: 10
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      const origStaticPos = { ...staticBody.position };

      resolver.resolve(staticBody, dynamicBody, contact);

      // Static body shouldn't move
      expect(staticBody.position).toEqual(origStaticPos);
      
      // Dynamic body should move
      expect(dynamicBody.position.x).not.toBe(15);
    });

    it('should move bodies proportional to inverse mass', () => {
      const lightBody = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        material: { density: 500 }  // Half the density
      });
      const heavyBody = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        material: { density: 1000 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      const origLightPos = { ...lightBody.position };
      const origHeavyPos = { ...heavyBody.position };

      resolver.resolve(lightBody, heavyBody, contact);

      // Light body should move more than heavy body
      const lightMovement = Math.abs(lightBody.position.x - origLightPos.x);
      const heavyMovement = Math.abs(heavyBody.position.x - origHeavyPos.x);
      
      expect(lightMovement).toBeGreaterThan(heavyMovement);
    });

    it('should not correct penetration below slop threshold', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const bodyB = createCircle({
        position: { x: 19.995, y: 0 },
        radius: 10
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 0.005  // Very small penetration (< slop)
      };

      const origPosA = { ...bodyA.position };
      const origPosB = { ...bodyB.position };

      resolver.resolve(bodyA, bodyB, contact);

      // Positions shouldn't change much (slop threshold)
      expect(Math.abs(bodyA.position.x - origPosA.x)).toBeLessThan(0.01);
      expect(Math.abs(bodyB.position.x - origPosB.x)).toBeLessThan(0.01);
    });
  });

  describe('impulse resolution', () => {
    it('should apply impulse to change velocities', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 }
      });
      const bodyB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: -10, y: 0 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      resolver.resolve(bodyA, bodyB, contact);

      // Velocities should change (bounce)
      expect(bodyA.velocity.x).not.toBe(10);
      expect(bodyB.velocity.x).not.toBe(-10);
    });

    it('should not resolve if bodies are separating', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: -10, y: 0 }  // Moving away
      });
      const bodyB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 }  // Moving away
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      const origVelA = { ...bodyA.velocity };
      const origVelB = { ...bodyB.velocity };

      resolver.resolve(bodyA, bodyB, contact);

      // Velocities might change slightly from position correction, but no impulse
      // The key is no large velocity change from impulse
      const velChangeA = Math.abs(bodyA.velocity.x - origVelA.x);
      const velChangeB = Math.abs(bodyB.velocity.x - origVelB.x);
      
      expect(velChangeA).toBeLessThan(1);
      expect(velChangeB).toBeLessThan(1);
    });

    it('should conserve momentum (approximately)', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 },
        material: { density: 1000 }
      });
      const bodyB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: -10, y: 0 },
        material: { density: 1000 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      // Calculate total momentum before
      const momentumBefore = bodyA.mass * bodyA.velocity.x + bodyB.mass * bodyB.velocity.x;

      resolver.resolve(bodyA, bodyB, contact);

      // Calculate total momentum after
      const momentumAfter = bodyA.mass * bodyA.velocity.x + bodyB.mass * bodyB.velocity.x;

      // Momentum should be approximately conserved
      expect(momentumAfter).toBeCloseTo(momentumBefore, 5);
    });

    it('should apply bounce based on restitution', () => {
      const bouncyBall = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 },
        material: { restitution: 1.0 }  // Perfect bounce
      });
      const wall = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 },
        type: BodyType.STATIC,
        material: { restitution: 1.0 }  // Wall also perfectly bouncy
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      // 10 px/s is at the default bounce threshold; disable it to test e alone
      new ImpulseResolver({ restitutionThreshold: 0 }).resolve(bouncyBall, wall, contact);

      // With perfect restitution and static wall, ball should reverse
      expect(bouncyBall.velocity.x).toBeLessThan(0);
      expect(Math.abs(bouncyBall.velocity.x)).toBeCloseTo(10, 1);
    });

    it('should reduce velocity with low restitution', () => {
      const deadBall = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 },
        material: { restitution: 0.0 }  // No bounce
      });
      const wall = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 },
        type: BodyType.STATIC
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      const origSpeed = Math.abs(deadBall.velocity.x);

      resolver.resolve(deadBall, wall, contact);

      // Ball should lose most energy (no bounce)
      const newSpeed = Math.abs(deadBall.velocity.x);
      expect(newSpeed).toBeLessThan(origSpeed);
    });

    it('should use minimum restitution of both bodies', () => {
      const bouncyBall = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 },
        material: { restitution: 1.0 }
      });
      const deadBall = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: -10, y: 0 },
        material: { restitution: 0.0 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      resolver.resolve(bouncyBall, deadBall, contact);

      // Should use min restitution (0.0), so low bounce
      const relativeSpeed = Math.abs(
        (bouncyBall.velocity.x - deadBall.velocity.x)
      );
      
      // With zero restitution, relative velocity should be near zero
      expect(relativeSpeed).toBeLessThan(5);
    });
  });

  describe('rotation and friction', () => {
    const contactAt = (x: number, y: number, normal = { x: 1, y: 0 }): Contact => ({
      point: { x, y },
      points: [{ x, y }],
      normal,
      depth: 0 // no positional correction, so momentum checks are exact
    });
    const angularMomentum = (bodies: ReturnType<typeof createCircle>[]) =>
      bodies.reduce(
        (sum, b) => sum + b.inertia * b.angularVelocity + b.mass * (b.position.x * b.velocity.y - b.position.y * b.velocity.x),
        0
      );

    it('should slow tangential motion and spin both circles in a glancing hit with friction', () => {
      const a = createCircle({ radius: 10, velocity: { x: 10, y: 10 }, material: { friction: 0.5 } });
      const b = createCircle({ position: { x: 19.5, y: 0 }, radius: 10, material: { friction: 0.5 } });
      const before = angularMomentum([a, b]);

      resolver.resolve(a, b, contactAt(10, 0));

      expect(a.velocity.y).toBeLessThan(10);
      expect(a.angularVelocity).not.toBe(0);
      expect(b.angularVelocity).not.toBe(0);
      // Impulses are equal and opposite at a shared point: angular momentum
      // (spin + orbital about the origin) is conserved
      expect(angularMomentum([a, b])).toBeCloseTo(before, 6);
    });

    it('should cap friction at μ × normal impulse (Coulomb)', () => {
      // Fast sideways sliding, gentle normal approach: friction saturates
      const slider = createCircle({ radius: 10, velocity: { x: 100, y: 5 }, material: { friction: 0.2, restitution: 0 } });
      const floor = createRectangle({ position: { x: 0, y: 20 }, width: 400, height: 20, type: BodyType.STATIC, material: { friction: 0.2 } });
      const contact: Contact = { point: { x: 0, y: 10 }, points: [{ x: 0, y: 10 }], normal: { x: 0, y: 1 }, depth: 0.5 };

      resolver.resolve(slider, floor, contact);

      // Normal impulse stops the 5 px/s approach: Δvy = -5; friction Δvx = μ × 5 = 1
      expect(slider.velocity.y).toBeCloseTo(0, 8);
      expect(slider.velocity.x).toBeCloseTo(100 - 0.2 * 5, 8);
    });

    it('should spin a box hit off-center and conserve linear momentum', () => {
      const box = createRectangle({ width: 40, height: 20, material: { friction: 0, restitution: 1 } });
      const ball = createCircle({ position: { x: -29, y: 8 }, radius: 10, velocity: { x: 50, y: 0 }, material: { friction: 0, restitution: 1 } });
      const px = box.mass * box.velocity.x + ball.mass * ball.velocity.x;

      // Ball (A) hits the box's left face (B) 8 px below its center
      resolver.resolve(ball, box, contactAt(-20, 8));

      expect(box.angularVelocity).toBeLessThan(0); // hit below center from the left: counter-clockwise on screen
      expect(box.mass * box.velocity.x + ball.mass * ball.velocity.x).toBeCloseTo(px, 6);
      // e = 1, frictionless: kinetic energy (linear + angular) is conserved
      const ke = (b: typeof box) => 0.5 * b.mass * Vec2.lengthSq(b.velocity) + 0.5 * b.inertia * b.angularVelocity ** 2;
      expect(ke(box) + ke(ball)).toBeCloseTo(0.5 * ball.mass * 50 * 50, 3);
    });

    it('should give symmetric impulses to a box landing flat on two points', () => {
      const box = createRectangle({ position: { x: 0, y: -10.5 }, width: 40, height: 20, velocity: { x: 0, y: 100 } });
      const floor = createRectangle({ position: { x: 0, y: 20 }, width: 400, height: 20, type: BodyType.STATIC });
      const contact: Contact = {
        point: { x: 0, y: 10 },
        points: [{ x: -20, y: 10 }, { x: 20, y: 10 }],
        normal: { x: 0, y: 1 },
        depth: 0.5
      };

      resolver.resolve(box, floor, contact);

      expect(box.angularVelocity).toBeCloseTo(0, 12);
      expect(box.velocity.y).toBeCloseTo(-0.2 * 100, 8); // restitution min(0.2, 0.2)
    });

    it('should reject a non-integer or non-positive iteration count', () => {
      expect(() => new ImpulseResolver({ iterations: 0 })).toThrow(RangeError);
      expect(() => new ImpulseResolver({ iterations: 2.5 })).toThrow(RangeError);
    });
  });

  describe('restitution threshold', () => {
    const bounceSpeed = (resolverUnderTest: ImpulseResolver, approach: number) => {
      const ball = createCircle({ radius: 10, velocity: { x: approach, y: 0 }, material: { restitution: 1 } });
      const wall = createCircle({ position: { x: 19.9, y: 0 }, radius: 10, type: BodyType.STATIC, material: { restitution: 1 } });
      resolverUnderTest.resolve(ball, wall, { point: { x: 10, y: 0 }, normal: { x: 1, y: 0 }, depth: 0.1 });
      return -ball.velocity.x;
    };

    it('should not bounce approaches slower than the threshold (default 10)', () => {
      expect(bounceSpeed(new ImpulseResolver(), 6)).toBeCloseTo(0, 10);
      expect(bounceSpeed(new ImpulseResolver(), 30)).toBeCloseTo(30, 10);
    });

    it('should honour a custom threshold', () => {
      expect(bounceSpeed(new ImpulseResolver({ restitutionThreshold: 50 }), 30)).toBeCloseTo(0, 10);
      expect(bounceSpeed(new ImpulseResolver({ restitutionThreshold: 0 }), 6)).toBeCloseTo(6, 10);
    });

    it('should reject a negative or non-finite threshold', () => {
      expect(() => new ImpulseResolver({ restitutionThreshold: -1 })).toThrow(RangeError);
      expect(() => new ImpulseResolver({ restitutionThreshold: NaN })).toThrow(RangeError);
    });
  });

  describe('batch solving', () => {
    it('should skip positional correction for contacts that are bouncing apart', () => {
      const ball = createCircle({ position: { x: 0, y: -8 }, radius: 10, velocity: { x: 0, y: 200 }, material: { restitution: 1 } });
      const floor = createRectangle({ position: { x: 0, y: 10 }, width: 400, height: 20, type: BodyType.STATIC, material: { restitution: 1 } });
      const pairs = [{ bodyA: ball, bodyB: floor, contact: { point: { x: 0, y: 0 }, normal: { x: 0, y: 1 }, depth: 2 } }];

      resolver.solveVelocities(pairs, 1 / 60);
      resolver.correctPositions(pairs);

      expect(ball.velocity.y).toBeCloseTo(-200, 8);
      expect(ball.position.y).toBe(-8); // not lifted: the bounce separates it
    });

    it('should let a speculative point close its gap but not overshoot', () => {
      const dt = 1 / 60;
      const ball = createCircle({ position: { x: 0, y: -12 }, radius: 10, velocity: { x: 0, y: 300 } });
      const floor = createRectangle({ position: { x: 0, y: 10 }, width: 400, height: 20, type: BodyType.STATIC });
      // Gap of 2 px: allowed approach speed is 2 / dt = 120
      const contact = { point: { x: 0, y: 0 }, points: [{ x: 0, y: 0 }], pointDepths: [-2], normal: { x: 0, y: 1 }, depth: 0 };

      resolver.solveVelocities([{ bodyA: ball, bodyB: floor, contact }], dt);

      expect(ball.velocity.y).toBeCloseTo(2 / dt, 8);
    });

    it('should ignore speculative points when no time step is given', () => {
      const ball = createCircle({ position: { x: 0, y: -12 }, radius: 10, velocity: { x: 0, y: 300 } });
      const floor = createRectangle({ position: { x: 0, y: 10 }, width: 400, height: 20, type: BodyType.STATIC });
      const contact = { point: { x: 0, y: 0 }, points: [{ x: 0, y: 0 }], pointDepths: [-2], normal: { x: 0, y: 1 }, depth: 0 };

      resolver.resolve(ball, floor, contact);

      expect(ball.velocity.y).toBe(300);
    });

    it('should solve several contacts together (a box pressed between two others)', () => {
      const noGravityStack = () => {
        const left = createRectangle({ position: { x: -20, y: 0 }, width: 20, height: 20, velocity: { x: 50, y: 0 }, material: { restitution: 0, friction: 0 } });
        const middle = createRectangle({ position: { x: 0, y: 0 }, width: 20, height: 20, material: { restitution: 0, friction: 0 } });
        const right = createRectangle({ position: { x: 20, y: 0 }, width: 20, height: 20, velocity: { x: -50, y: 0 }, material: { restitution: 0, friction: 0 } });
        const edge = (x: number) => ({ point: { x, y: 0 }, points: [{ x, y: -10 }, { x, y: 10 }], normal: { x: 1, y: 0 }, depth: 0.1 });
        return { left, middle, right, pairs: [
          { bodyA: left, bodyB: middle, contact: edge(-10) },
          { bodyA: middle, bodyB: right, contact: edge(10) },
        ] };
      };
      const { left, middle, right, pairs } = noGravityStack();

      resolver.solveVelocities(pairs, 1 / 60);

      // Perfectly inelastic, equal masses, symmetric: everything stops
      // (a single pass would leave the outer boxes at ~12 px/s)
      for (const b of [left, middle, right]) expect(Math.abs(b.velocity.x)).toBeLessThan(1e-3);
    });
  });

  describe('restitution combine rule', () => {
    // Head-on, equal masses, approach speed 20: separation speed = e_combined * 20
    const separationSpeed = (resolverUnderTest: ImpulseResolver, eA: number, eB: number) => {
      const a = createCircle({ radius: 10, velocity: { x: 10, y: 0 }, material: { restitution: eA } });
      const b = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: -10, y: 0 },
        material: { restitution: eB }
      });
      const contact: Contact = { point: { x: 10, y: 0 }, normal: { x: 1, y: 0 }, depth: 5 };
      resolverUnderTest.resolve(a, b, contact);
      return b.velocity.x - a.velocity.x;
    };

    it('should default to min', () => {
      expect(separationSpeed(new ImpulseResolver(), 1, 0.2)).toBeCloseTo(0.2 * 20, 10);
    });

    it.each([
      ['min', 0.2],
      ['max', 1],
      ['average', 0.6],
      ['multiply', 0.2],
    ] as const)('should combine with %s', (rule, expected) => {
      const custom = new ImpulseResolver({ restitutionCombine: rule });
      expect(separationSpeed(custom, 1, 0.2)).toBeCloseTo(expected * 20, 10);
    });

    it('should accept a custom combine function', () => {
      const geometricMean = new ImpulseResolver({
        restitutionCombine: (a, b) => Math.sqrt(a * b)
      });
      expect(separationSpeed(geometricMean, 0.9, 0.4)).toBeCloseTo(0.6 * 20, 10);
    });

    it('should reject an unknown rule name', () => {
      expect(
        () => new ImpulseResolver({ restitutionCombine: 'maximum' as never })
      ).toThrow(/Unknown combine rule "maximum"/);
    });
  });

  describe('static and kinematic bodies', () => {
    it('should not move static bodies', () => {
      const staticA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        type: BodyType.STATIC,
        velocity: { x: 0, y: 0 }
      });
      const dynamicB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      const origStaticPos = { ...staticA.position };
      const origStaticVel = { ...staticA.velocity };

      resolver.resolve(staticA, dynamicB, contact);

      expect(staticA.position).toEqual(origStaticPos);
      expect(staticA.velocity).toEqual(origStaticVel);
    });

    it('should move dynamic body away from static body', () => {
      const staticA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        type: BodyType.STATIC
      });
      const dynamicB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: -5, y: 0 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      const origPos = dynamicB.position.x;

      resolver.resolve(staticA, dynamicB, contact);

      // Dynamic body should move away from static
      expect(dynamicB.position.x).toBeGreaterThan(origPos);
    });

    it('should handle two static bodies (no-op)', () => {
      const staticA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        type: BodyType.STATIC
      });
      const staticB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        type: BodyType.STATIC
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      const origPosA = { ...staticA.position };
      const origPosB = { ...staticB.position };

      resolver.resolve(staticA, staticB, contact);

      // Neither should move (both invMass = 0)
      expect(staticA.position).toEqual(origPosA);
      expect(staticB.position).toEqual(origPosB);
      // Velocities must stay finite (previously 0/0 made them NaN)
      expect(staticA.velocity).toEqual({ x: 0, y: 0 });
      expect(staticB.velocity).toEqual({ x: 0, y: 0 });
    });

    it('should leave kinematic and static bodies untouched when they meet', () => {
      const kinematic = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        type: BodyType.KINEMATIC,
        velocity: { x: 50, y: 0 }
      });
      const staticBody = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        type: BodyType.STATIC
      });
      const contact: Contact = { point: { x: 10, y: 0 }, normal: { x: 1, y: 0 }, depth: 5 };

      resolver.resolve(kinematic, staticBody, contact);

      expect(kinematic.velocity).toEqual({ x: 50, y: 0 });
      expect(staticBody.velocity).toEqual({ x: 0, y: 0 });
    });

    it('should leave two approaching kinematic bodies untouched', () => {
      const a = createCircle({ radius: 10, type: BodyType.KINEMATIC, velocity: { x: 50, y: 0 } });
      const b = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        type: BodyType.KINEMATIC,
        velocity: { x: -50, y: 0 }
      });
      const contact: Contact = { point: { x: 10, y: 0 }, normal: { x: 1, y: 0 }, depth: 5 };

      resolver.resolve(a, b, contact);

      expect(a.velocity).toEqual({ x: 50, y: 0 });
      expect(b.velocity).toEqual({ x: -50, y: 0 });
    });
  });

  describe('collision scenarios', () => {
    it('should handle head-on collision', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 100, y: 0 }
      });
      const bodyB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: -100, y: 0 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      resolver.resolve(bodyA, bodyB, contact);

      // Velocities should reverse (approximately)
      expect(bodyA.velocity.x).toBeLessThan(0);
      expect(bodyB.velocity.x).toBeGreaterThan(0);
    });

    it('should handle glancing collision (frictionless)', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 10 },  // Diagonal
        material: { friction: 0 }
      });
      const bodyB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 },
        material: { friction: 0 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },  // Horizontal contact
        depth: 5
      };

      const origVelY = bodyA.velocity.y;

      resolver.resolve(bodyA, bodyB, contact);

      // X velocity should change, Y should stay similar (glancing)
      expect(bodyA.velocity.x).not.toBe(10);
      expect(bodyA.velocity.y).toBeCloseTo(origVelY, 1);
    });

    it('should handle collision at different angles', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 10 }
      });
      const bodyB = createCircle({
        position: { x: 10, y: 10 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });

      // 45-degree contact
      const normal = {
        x: 1 / Math.sqrt(2),
        y: 1 / Math.sqrt(2)
      };

      const contact: Contact = {
        point: { x: 5, y: 5 },
        normal,
        depth: 5
      };

      resolver.resolve(bodyA, bodyB, contact);

      // Both velocity components should change
      expect(bodyA.velocity.x).not.toBe(10);
      expect(bodyA.velocity.y).not.toBe(10);
    });
  });

  describe('edge cases', () => {
    it('should handle zero penetration depth', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 0 }
      });
      const bodyB = createCircle({
        position: { x: 20, y: 0 },
        radius: 10,
        velocity: { x: -10, y: 0 }
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 0  // Just touching
      };

      // Should not crash
      expect(() => resolver.resolve(bodyA, bodyB, contact)).not.toThrow();
    });

    it('should handle very large penetration', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 }
      });
      const bodyB = createCircle({
        position: { x: 0, y: 0 },  // Same position!
        radius: 10,
        velocity: { x: 0, y: 0 }
      });

      const contact: Contact = {
        point: { x: 0, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 20  // Completely overlapping
      };

      // Should not crash
      expect(() => resolver.resolve(bodyA, bodyB, contact)).not.toThrow();

      // Bodies should be separated
      expect(bodyA.position.x).not.toBe(bodyB.position.x);
    });

    it('should handle very high velocities', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 1000, y: 0 }
      });
      const bodyB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 },
        type: BodyType.STATIC
      });

      const contact: Contact = {
        point: { x: 10, y: 0 },
        normal: { x: 1, y: 0 },
        depth: 5
      };

      // Should not crash or produce NaN
      resolver.resolve(bodyA, bodyB, contact);

      expect(isNaN(bodyA.velocity.x)).toBe(false);
      expect(isNaN(bodyA.velocity.y)).toBe(false);
      expect(isFinite(bodyA.velocity.x)).toBe(true);
    });
  });

  describe('material properties', () => {
    it('should respect different restitution values', () => {
      const testRestitution = (e: number) => {
        resetBodyIdCounter();
        
        const ball = createCircle({
          position: { x: 0, y: 0 },
          radius: 10,
          velocity: { x: 10, y: 0 },
          material: { restitution: e }
        });
        const wall = createCircle({
          position: { x: 15, y: 0 },
          radius: 10,
          type: BodyType.STATIC,
          material: { restitution: 1.0 }  // Wall is perfectly bouncy
        });

        const contact: Contact = {
          point: { x: 10, y: 0 },
          normal: { x: 1, y: 0 },
          depth: 5
        };

        new ImpulseResolver({ restitutionThreshold: 0 }).resolve(ball, wall, contact);
        return Math.abs(ball.velocity.x);
      };

      const speedHigh = testRestitution(1.0);
      const speedMid = testRestitution(0.5);
      const speedLow = testRestitution(0.0);

      // Higher restitution = higher bounce speed
      expect(speedHigh).toBeGreaterThan(speedMid);
      expect(speedMid).toBeGreaterThan(speedLow);
    });
  });
});

