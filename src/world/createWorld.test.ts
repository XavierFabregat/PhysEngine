import { describe, it, expect } from 'vitest';
import { createWorld } from './createWorld';
import { VerletIntegrator } from '../systems/integrators/Verlet';
import { BruteForceBroadPhase } from '../systems/broadphase/BruteForce';
import { ImpulseResolver } from '../systems/resolvers/ImpulseResolver';

describe('createWorld', () => {
  describe('basic creation', () => {
    it('should create world with default configuration', () => {
      const world = createWorld();
      
      expect(world.bodies).toEqual([]);
      expect(world.gravity).toEqual({ x: 0, y: 400 });
      expect(world.time).toBe(0);
      expect(world.integrator).toBeDefined();
    });

    it('should create empty bodies array', () => {
      const world = createWorld();
      
      expect(Array.isArray(world.bodies)).toBe(true);
      expect(world.bodies.length).toBe(0);
    });

    it('should initialize time to zero', () => {
      const world = createWorld();
      
      expect(world.time).toBe(0);
    });
  });

  describe('custom gravity', () => {
    it('should accept custom gravity', () => {
      const world = createWorld({
        gravity: { x: 0, y: 9.81 },
      });
      
      expect(world.gravity.x).toBe(0);
      expect(world.gravity.y).toBe(9.81);
    });

    it('should handle zero gravity (space)', () => {
      const world = createWorld({
        gravity: { x: 0, y: 0 },
      });
      
      expect(world.gravity).toEqual({ x: 0, y: 0 });
    });

    it('should handle negative gravity (upward)', () => {
      const world = createWorld({
        gravity: { x: 0, y: -100 },
      });
      
      expect(world.gravity.y).toBe(-100);
    });

    it('should handle sideways gravity', () => {
      const world = createWorld({
        gravity: { x: 50, y: 0 },
      });
      
      expect(world.gravity.x).toBe(50);
      expect(world.gravity.y).toBe(0);
    });

    it('should handle diagonal gravity', () => {
      const world = createWorld({
        gravity: { x: 10, y: 10 },
      });
      
      expect(world.gravity.x).toBe(10);
      expect(world.gravity.y).toBe(10);
    });
  });

  describe('multiple worlds', () => {
    it('should create independent worlds', () => {
      const world1 = createWorld({ gravity: { x: 0, y: 100 } });
      const world2 = createWorld({ gravity: { x: 0, y: 200 } });
      
      expect(world1.gravity.y).toBe(100);
      expect(world2.gravity.y).toBe(200);
      expect(world1).not.toBe(world2);
      expect(world1.bodies).not.toBe(world2.bodies);
    });

    it('should not share bodies array between worlds', () => {
      const world1 = createWorld();
      const world2 = createWorld();
      
      expect(world1.bodies).not.toBe(world2.bodies);
    });

    it('should not share default gravity object between worlds', () => {
      const world1 = createWorld();
      const world2 = createWorld();
      
      // Mutating world1's gravity should not affect world2
      world1.gravity.x = 100;
      world1.gravity.y = 999;
      
      expect(world2.gravity.x).toBe(0);
      expect(world2.gravity.y).toBe(400);
      expect(world1.gravity).not.toBe(world2.gravity);
    });

    it('should not mutate DEFAULT_CONFIG when using default gravity', () => {
      const world1 = createWorld();
      const world2 = createWorld();
      
      world1.gravity.x = 123;
      world1.gravity.y = 456;
      
      // Third world should still get correct defaults
      const world3 = createWorld();
      expect(world3.gravity.x).toBe(0);
      expect(world3.gravity.y).toBe(400);
    });
  });

  describe('integrator configuration', () => {
    it('should use default Verlet integrator', () => {
      const world = createWorld();
      
      expect(world.integrator).toBeInstanceOf(VerletIntegrator);
    });

    it('should accept custom integrator', () => {
      const customIntegrator = new VerletIntegrator();
      const world = createWorld({ integrator: customIntegrator });
      
      expect(world.integrator).toBe(customIntegrator);
    });

    it('should not share default integrator between worlds', () => {
      const world1 = createWorld();
      const world2 = createWorld();
      
      expect(world1.integrator).not.toBe(world2.integrator);
    });
  });

  describe('collision system configuration', () => {
    it('should use default BruteForce broad phase', () => {
      const world = createWorld();
      
      expect(world.broadPhase).toBeInstanceOf(BruteForceBroadPhase);
    });

    it('should use default Impulse resolver', () => {
      const world = createWorld();
      
      expect(world.resolver).toBeInstanceOf(ImpulseResolver);
    });

    it('should accept custom broad phase', () => {
      const customBroadPhase = new BruteForceBroadPhase();
      const world = createWorld({ broadPhase: customBroadPhase });
      
      expect(world.broadPhase).toBe(customBroadPhase);
    });

    it('should accept custom resolver', () => {
      const customResolver = new ImpulseResolver();
      const world = createWorld({ resolver: customResolver });
      
      expect(world.resolver).toBe(customResolver);
    });

    it('should not share default broad phase between worlds', () => {
      const world1 = createWorld();
      const world2 = createWorld();
      
      expect(world1.broadPhase).not.toBe(world2.broadPhase);
    });

    it('should not share default resolver between worlds', () => {
      const world1 = createWorld();
      const world2 = createWorld();
      
      expect(world1.resolver).not.toBe(world2.resolver);
    });
  });
});

