import { describe, it, expect, beforeEach } from 'vitest';
import { ImpulseResolver } from './ImpulseResolver';
import { createCircle, resetBodyIdCounter } from '../../bodies/createCircle';
import { BodyType } from '../../types/BodyType';
import type { Contact } from '../../types/Contact.js';

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

      resolver.resolve(bouncyBall, wall, contact);

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

    it('should handle glancing collision', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        velocity: { x: 10, y: 10 }  // Diagonal
      });
      const bodyB = createCircle({
        position: { x: 15, y: 0 },
        radius: 10,
        velocity: { x: 0, y: 0 }
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

        resolver.resolve(ball, wall, contact);
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

