import { describe, it, expect, beforeEach } from 'vitest';
import { SemiImplicitEulerIntegrator, VerletIntegrator } from './SemiImplicitEuler';
import { createCircle, resetBodyIdCounter } from '../../bodies/createCircle';
import { createRectangle } from '../../bodies/createRectangle';
import { BodyType } from '../../types/BodyType';

describe('SemiImplicitEulerIntegrator', () => {
  let integrator: SemiImplicitEulerIntegrator;

  beforeEach(() => {
    integrator = new SemiImplicitEulerIntegrator();
    resetBodyIdCounter();
  });

  describe('static bodies', () => {
    it('should not move static bodies', () => {
      const body = createCircle({
        position: { x: 100, y: 200 },
        radius: 20,
        type: BodyType.STATIC,
      });

      const originalPos = { ...body.position };
      
      integrator.integrate(body, 1/60, { x: 0, y: 400 });
      
      expect(body.position).toEqual(originalPos);
    });

    it('should not apply forces to static bodies', () => {
      const body = createCircle({
        position: { x: 100, y: 200 },
        radius: 20,
        type: BodyType.STATIC,
      });

      body.force = { x: 100, y: 100 };
      
      integrator.integrate(body, 1/60, { x: 0, y: 400 });
      
      // Force should remain (not reset for static)
      expect(body.force).toEqual({ x: 100, y: 100 });
    });
  });

  describe('kinematic bodies', () => {
    it('should move kinematic bodies by velocity only', () => {
      const body = createCircle({
        position: { x: 100, y: 200 },
        radius: 20,
        velocity: { x: 10, y: -5 },
        type: BodyType.KINEMATIC,
      });

      integrator.integrate(body, 1, { x: 0, y: 400 });
      
      expect(body.position.x).toBeCloseTo(110, 10);
      expect(body.position.y).toBeCloseTo(195, 10);
    });

    it('should not apply gravity to kinematic bodies', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        velocity: { x: 0, y: 0 },
        type: BodyType.KINEMATIC,
      });

      integrator.integrate(body, 1, { x: 0, y: 100 });
      
      // Should not move (no gravity applied)
      expect(body.position).toEqual({ x: 0, y: 0 });
      expect(body.velocity).toEqual({ x: 0, y: 0 });
    });

    it('should clear forces and torque so they do not accumulate', () => {
      const body = createCircle({ radius: 20, type: BodyType.KINEMATIC });
      body.force = { x: 5, y: 0 };
      body.torque = 3;

      integrator.integrate(body, 1 / 60, { x: 0, y: 0 });

      expect(body.force).toEqual({ x: 0, y: 0 });
      expect(body.torque).toBe(0);
    });

    it('should update rotation from angular velocity', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        rotation: 0,
        angularVelocity: Math.PI,
        type: BodyType.KINEMATIC,
      });

      integrator.integrate(body, 1, { x: 0, y: 0 });
      
      expect(body.rotation).toBeCloseTo(Math.PI, 10);
    });
  });

  describe('dynamic bodies - linear motion', () => {
    it('should apply gravity to dynamic bodies', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        velocity: { x: 0, y: 0 },
      });

      integrator.integrate(body, 1, { x: 0, y: 100 });
      
      // After 1 second with gravity 100:
      // a = g = 100
      // v = 0 + 100 * 1 = 100
      // p = 0 + 100 * 1 = 100
      expect(body.velocity.y).toBeCloseTo(100, 5);
      expect(body.position.y).toBeCloseTo(100, 5);
    });

    it('should update position from velocity', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        velocity: { x: 50, y: 30 },
      });

      integrator.integrate(body, 1, { x: 0, y: 0 });
      
      // p = p + v * dt
      expect(body.position.x).toBeCloseTo(50, 10);
      expect(body.position.y).toBeCloseTo(30, 10);
    });

    it('should update velocity from acceleration', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        velocity: { x: 10, y: 10 },
      });

      // Manually add force
      body.force = { x: body.mass * 20, y: body.mass * 30 }; // a = F/m = 20, 30
      
      integrator.integrate(body, 1, { x: 0, y: 0 });
      
      // v = v + a * dt = (10, 10) + (20, 30) * 1
      expect(body.velocity.x).toBeCloseTo(30, 5);
      expect(body.velocity.y).toBeCloseTo(40, 5);
    });

    it('should handle small time steps correctly', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        velocity: { x: 60, y: 60 },
      });

      integrator.integrate(body, 1/60, { x: 0, y: 0 });
      
      // p = 0 + 60 * (1/60) = 1
      expect(body.position.x).toBeCloseTo(1, 10);
      expect(body.position.y).toBeCloseTo(1, 10);
    });

    it('should reset forces after integration', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
      });

      body.force = { x: 100, y: 200 };
      
      integrator.integrate(body, 1/60, { x: 0, y: 0 });
      
      // Forces should be reset to zero
      expect(body.force).toEqual({ x: 0, y: 0 });
      expect(body.torque).toBe(0);
    });
  });

  describe('dynamic bodies - angular motion', () => {
    it('should update rotation from angular velocity', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        rotation: 0,
        angularVelocity: Math.PI,
      });

      integrator.integrate(body, 1, { x: 0, y: 0 });
      
      // θ = θ + ω * dt = 0 + π * 1 = π
      expect(body.rotation).toBeCloseTo(Math.PI, 10);
    });

    it('should update angular velocity from torque', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        angularVelocity: 0,
      });

      // Apply torque
      body.torque = body.inertia * Math.PI; // α = τ/I = π
      
      integrator.integrate(body, 1, { x: 0, y: 0 });
      
      // ω = ω + α * dt = 0 + π * 1 = π
      expect(body.angularVelocity).toBeCloseTo(Math.PI, 5);
    });

    it('should reset torque after integration', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
      });

      body.torque = 100;
      
      integrator.integrate(body, 1/60, { x: 0, y: 0 });
      
      expect(body.torque).toBe(0);
    });
  });

  describe('integration accuracy', () => {
    it('should handle multiple small steps', () => {
      const body = createCircle({
        position: { x: 0, y: 0 },
        radius: 20,
        velocity: { x: 0, y: 0 },
      });

      const gravity = { x: 0, y: 100 };
      const steps = 60;
      const dt = 1 / 60;

      for (let i = 0; i < steps; i++) {
        integrator.integrate(body, dt, gravity);
      }

      // After 1 second (60 steps of 1/60):
      // With constant gravity, final velocity ≈ 100 m/s
      expect(body.velocity.y).toBeCloseTo(100, 2);
    });

    it('should have first-order free-fall error of ½·g·t·dt', () => {
      const body = createCircle({ radius: 1 });
      const g = 10;
      const dt = 1 / 60;

      for (let i = 0; i < 60; i++) {
        integrator.integrate(body, dt, { x: 0, y: g });
      }

      // Exact: ½gt² = 5; semi-implicit Euler adds ½·g·t·dt
      expect(body.position.y).toBeCloseTo(5 + 0.5 * g * 1 * dt, 10);
    });

    it('should keep harmonic oscillator energy bounded (symplectic)', () => {
      const body = createCircle({ radius: 1, position: { x: 1, y: 0 } });
      const k = 100 * body.mass; // ω = 10 rad/s
      const dt = 1 / 60;
      const energy = () =>
        0.5 * body.mass * body.velocity.x ** 2 + 0.5 * k * body.position.x ** 2;
      const initial = energy();

      for (let i = 0; i < 6000; i++) {
        body.force = { x: -k * body.position.x, y: 0 };
        integrator.integrate(body, dt, { x: 0, y: 0 });
      }

      expect(energy() / initial).toBeLessThan(1.2);
      expect(energy() / initial).toBeGreaterThan(0.8);
    });

    it('should be deterministic', () => {
      const body1 = createCircle({ radius: 20, position: { x: 0, y: 0 } });
      const body2 = createCircle({ radius: 20, position: { x: 0, y: 0 } });

      const gravity = { x: 0, y: 400 };

      for (let i = 0; i < 10; i++) {
        integrator.integrate(body1, 1/60, gravity);
        integrator.integrate(body2, 1/60, gravity);
      }

      expect(body1.position.x).toBeCloseTo(body2.position.x, 10);
      expect(body1.position.y).toBeCloseTo(body2.position.y, 10);
      expect(body1.velocity.x).toBeCloseTo(body2.velocity.x, 10);
      expect(body1.velocity.y).toBeCloseTo(body2.velocity.y, 10);
    });
  });

  describe('deprecated VerletIntegrator alias', () => {
    it('should be the same class', () => {
      expect(VerletIntegrator).toBe(SemiImplicitEulerIntegrator);
      expect(new VerletIntegrator()).toBeInstanceOf(SemiImplicitEulerIntegrator);
    });
  });
});
