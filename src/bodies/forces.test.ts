import { describe, it, expect, beforeEach } from 'vitest';
import { applyForce, applyImpulse, applyTorque } from './forces';
import { createCircle, resetBodyIdCounter } from './createCircle';
import { createRectangle } from './createRectangle';
import { createWorld } from '../world/createWorld';
import { step } from '../world/step';
import { addBody } from '../world/body';
import { BodyType } from '../types/BodyType';

describe('forces API', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('applyImpulse', () => {
    it('should change velocity by J/m at the center of mass', () => {
      const ball = createCircle({ radius: 10 });
      applyImpulse(ball, { x: 3 * ball.mass, y: -2 * ball.mass });
      expect(ball.velocity.x).toBeCloseTo(3, 10);
      expect(ball.velocity.y).toBeCloseTo(-2, 10);
      expect(ball.angularVelocity).toBe(0);
    });

    it('should add spin (r × J)/I when applied off-centre', () => {
      const bar = createRectangle({ position: { x: 100, y: 50 }, width: 80, height: 10 });
      const impulse = { x: 0, y: 5 * bar.mass };
      applyImpulse(bar, impulse, { x: 130, y: 50 }); // 30 px right of center, pushed down

      expect(bar.velocity.y).toBeCloseTo(5, 10);
      // r × J = 30 × 5m; +y at +x turns +x toward +y (clockwise on screen) → positive
      expect(bar.angularVelocity).toBeCloseTo((30 * 5 * bar.mass) / bar.inertia, 10);
    });

    it('should spin a disk kicked tangentially at its rim by r·v/(I/m)', () => {
      const ball = createCircle({ radius: 10 });
      applyImpulse(ball, { x: 0, y: -4 * ball.mass }, { x: -10, y: 0 }); // tangential kick at the rim
      // Solid disk kicked at the rim: ω = r·v / (I/m) = 10·4 / (½·10²) = 0.8
      expect(ball.velocity.y).toBeCloseTo(-4, 10);
      expect(ball.angularVelocity).toBeCloseTo(0.8, 10);
    });
  });

  describe('applyForce', () => {
    it('should accelerate a body at F/m over a step and then clear', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      const ball = createCircle({ radius: 10 });
      addBody(world, ball);

      for (let i = 0; i < 60; i++) {
        applyForce(ball, { x: 120 * ball.mass, y: 0 });
        step(world, 1 / 60);
      }
      expect(ball.velocity.x).toBeCloseTo(120, 8); // 1 s at 120 units/s²
      expect(ball.force).toEqual({ x: 0, y: 0 });

      step(world, 1 / 60); // no force this step: coasts
      expect(ball.velocity.x).toBeCloseTo(120, 8);
    });

    it('should add torque r × F off-centre, matching applyTorque', () => {
      const a = createRectangle({ width: 80, height: 10 });
      const b = createRectangle({ width: 80, height: 10 });
      applyForce(a, { x: 0, y: -50 }, { x: -40, y: 0 }); // up at the left end
      applyTorque(b, (-40) * (-50) - 0 * 0);

      expect(a.torque).toBeCloseTo(b.torque, 10);
      expect(a.force).toEqual({ x: 0, y: -50 });
      expect(b.force).toEqual({ x: 0, y: 0 });
    });

    it('should accumulate several forces', () => {
      const ball = createCircle({ radius: 10 });
      applyForce(ball, { x: 1, y: 2 });
      applyForce(ball, { x: 3, y: -1 });
      expect(ball.force).toEqual({ x: 4, y: 1 });
    });
  });

  describe('applyTorque', () => {
    it('should spin a body at τ/I', () => {
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      const ball = createCircle({ radius: 10 });
      addBody(world, ball);
      applyTorque(ball, 2 * ball.inertia);
      step(world, 0.5);
      expect(ball.angularVelocity).toBeCloseTo(1, 10);
    });
  });

  it('should ignore static and kinematic bodies', () => {
    for (const type of [BodyType.STATIC, BodyType.KINEMATIC]) {
      const body = createCircle({ radius: 10, type, velocity: { x: 1, y: 0 } });
      applyImpulse(body, { x: 100, y: 0 }, { x: 0, y: 10 });
      applyForce(body, { x: 100, y: 0 }, { x: 0, y: 10 });
      applyTorque(body, 100);
      expect(body.velocity).toEqual({ x: 1, y: 0 });
      expect(body.force).toEqual({ x: 0, y: 0 });
      expect(body.torque).toBe(0);
      expect(body.angularVelocity).toBe(0);
    }
  });

  it('should reject non-finite input', () => {
    const ball = createCircle({ radius: 10 });
    expect(() => applyForce(ball, { x: NaN, y: 0 })).toThrow(RangeError);
    expect(() => applyForce(ball, { x: 1, y: 0 }, { x: Infinity, y: 0 })).toThrow(RangeError);
    expect(() => applyImpulse(ball, { x: 0, y: Infinity })).toThrow(RangeError);
    expect(() => applyTorque(ball, NaN)).toThrow(RangeError);
  });
});
