import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from './createWorld';
import { addBody, removeBody, getBody, getBodies, getBodyCount, clear, hasBody } from './body';
import { createCircle, resetBodyIdCounter as resetCircleId } from '../bodies/createCircle';
import { createRectangle, resetBodyIdCounter as resetRectId } from '../bodies/createRectangle';
import { BodyType } from '../types/BodyType';

describe('World Body Management', () => {
  beforeEach(() => {
    resetCircleId();
    resetRectId();
  });

  describe('addBody', () => {
    it('should add body to world', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      
      expect(world.bodies.length).toBe(1);
      expect(world.bodies[0]).toBe(body);
    });

    it('should add multiple bodies', () => {
      const world = createWorld();
      const body1 = createCircle({ radius: 10 });
      const body2 = createCircle({ radius: 20 });
      const body3 = createRectangle({ width: 30, height: 40 });
      
      addBody(world, body1);
      addBody(world, body2);
      addBody(world, body3);
      
      expect(world.bodies.length).toBe(3);
      expect(world.bodies[0]).toBe(body1);
      expect(world.bodies[1]).toBe(body2);
      expect(world.bodies[2]).toBe(body3);
    });

    it('should allow adding same body multiple times (no duplicate check)', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      addBody(world, body);
      
      expect(world.bodies.length).toBe(2);
      expect(world.bodies[0]).toBe(body);
      expect(world.bodies[1]).toBe(body);
    });

    it('should mutate the world', () => {
      const world = createWorld();
      const originalBodies = world.bodies;
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      
      // Same array reference (mutated)
      expect(world.bodies).toBe(originalBodies);
    });
  });

  describe('removeBody', () => {
    it('should remove body by ID', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      const removed = removeBody(world, body.id);
      
      expect(removed).toBe(true);
      expect(world.bodies.length).toBe(0);
    });

    it('should return false if body not found', () => {
      const world = createWorld();
      
      const removed = removeBody(world, 'nonexistent_id');
      
      expect(removed).toBe(false);
    });

    it('should remove correct body from multiple bodies', () => {
      const world = createWorld();
      const body1 = createCircle({ radius: 10 });
      const body2 = createCircle({ radius: 20 });
      const body3 = createCircle({ radius: 30 });
      
      addBody(world, body1);
      addBody(world, body2);
      addBody(world, body3);
      
      const removed = removeBody(world, body2.id);
      
      expect(removed).toBe(true);
      expect(world.bodies.length).toBe(2);
      expect(world.bodies[0]).toBe(body1);
      expect(world.bodies[1]).toBe(body3);
    });

    it('should handle removing first body', () => {
      const world = createWorld();
      const body1 = createCircle({ radius: 10 });
      const body2 = createCircle({ radius: 20 });
      
      addBody(world, body1);
      addBody(world, body2);
      
      removeBody(world, body1.id);
      
      expect(world.bodies.length).toBe(1);
      expect(world.bodies[0]).toBe(body2);
    });

    it('should handle removing last body', () => {
      const world = createWorld();
      const body1 = createCircle({ radius: 10 });
      const body2 = createCircle({ radius: 20 });
      
      addBody(world, body1);
      addBody(world, body2);
      
      removeBody(world, body2.id);
      
      expect(world.bodies.length).toBe(1);
      expect(world.bodies[0]).toBe(body1);
    });

    it('should handle removing only body', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      removeBody(world, body.id);
      
      expect(world.bodies.length).toBe(0);
    });
  });

  describe('getBody', () => {
    it('should find body by ID', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      const found = getBody(world, body.id);
      
      expect(found).toBe(body);
    });

    it('should return undefined if body not found', () => {
      const world = createWorld();
      
      const found = getBody(world, 'nonexistent_id');
      
      expect(found).toBeUndefined();
    });

    it('should find correct body among multiple bodies', () => {
      const world = createWorld();
      const body1 = createCircle({ radius: 10 });
      const body2 = createCircle({ radius: 20 });
      const body3 = createCircle({ radius: 30 });
      
      addBody(world, body1);
      addBody(world, body2);
      addBody(world, body3);
      
      const found = getBody(world, body2.id);
      
      expect(found).toBe(body2);
    });

    it('should return undefined for empty world', () => {
      const world = createWorld();
      
      const found = getBody(world, 'any_id');
      
      expect(found).toBeUndefined();
    });
  });

  describe('getBodies', () => {
    it('should return empty array for new world', () => {
      const world = createWorld();
      
      const bodies = getBodies(world);
      
      expect(bodies).toEqual([]);
    });

    it('should return all bodies', () => {
      const world = createWorld();
      const body1 = createCircle({ radius: 10 });
      const body2 = createCircle({ radius: 20 });
      
      addBody(world, body1);
      addBody(world, body2);
      
      const bodies = getBodies(world);
      
      expect(bodies.length).toBe(2);
      expect(bodies[0]).toBe(body1);
      expect(bodies[1]).toBe(body2);
    });

    it('should return reference to internal array', () => {
      const world = createWorld();
      
      const bodies = getBodies(world);
      
      expect(bodies).toBe(world.bodies);
    });
  });

  describe('getBodyCount', () => {
    it('should return 0 for empty world', () => {
      const world = createWorld();
      
      expect(getBodyCount(world)).toBe(0);
    });

    it('should return correct count', () => {
      const world = createWorld();
      
      addBody(world, createCircle({ radius: 10 }));
      expect(getBodyCount(world)).toBe(1);
      
      addBody(world, createCircle({ radius: 20 }));
      expect(getBodyCount(world)).toBe(2);
      
      addBody(world, createRectangle({ width: 30, height: 40 }));
      expect(getBodyCount(world)).toBe(3);
    });

    it('should update after removing body', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      expect(getBodyCount(world)).toBe(1);
      
      removeBody(world, body.id);
      expect(getBodyCount(world)).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all bodies', () => {
      const world = createWorld();
      
      addBody(world, createCircle({ radius: 10 }));
      addBody(world, createCircle({ radius: 20 }));
      addBody(world, createRectangle({ width: 30, height: 40 }));
      
      expect(world.bodies.length).toBe(3);
      
      clear(world);
      
      expect(world.bodies.length).toBe(0);
    });

    it('should do nothing for empty world', () => {
      const world = createWorld();
      
      clear(world);
      
      expect(world.bodies.length).toBe(0);
    });

    it('should maintain same array reference', () => {
      const world = createWorld();
      const originalBodies = world.bodies;
      
      addBody(world, createCircle({ radius: 10 }));
      clear(world);
      
      expect(world.bodies).toBe(originalBodies);
    });
  });

  describe('hasBody', () => {
    it('should return false for empty world', () => {
      const world = createWorld();
      
      expect(hasBody(world, 'any_id')).toBe(false);
    });

    it('should return true if body exists', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      
      expect(hasBody(world, body.id)).toBe(true);
    });

    it('should return false if body does not exist', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      
      expect(hasBody(world, 'nonexistent_id')).toBe(false);
    });

    it('should return false after body is removed', () => {
      const world = createWorld();
      const body = createCircle({ radius: 10 });
      
      addBody(world, body);
      expect(hasBody(world, body.id)).toBe(true);
      
      removeBody(world, body.id);
      expect(hasBody(world, body.id)).toBe(false);
    });

    it('should work with multiple bodies', () => {
      const world = createWorld();
      const body1 = createCircle({ radius: 10 });
      const body2 = createCircle({ radius: 20 });
      const body3 = createCircle({ radius: 30 });
      
      addBody(world, body1);
      addBody(world, body3);
      
      expect(hasBody(world, body1.id)).toBe(true);
      expect(hasBody(world, body2.id)).toBe(false);
      expect(hasBody(world, body3.id)).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical game setup', () => {
      const world = createWorld({ gravity: { x: 0, y: 400 } });
      
      // Add some bodies
      const player = createCircle({
        radius: 20,
        position: { x: 100, y: 100 },
      });
      const floor = createRectangle({
        width: 800,
        height: 40,
        position: { x: 400, y: 580 },
        type: BodyType.STATIC,
      });
      const enemy = createCircle({
        radius: 15,
        position: { x: 300, y: 200 },
      });
      
      addBody(world, player);
      addBody(world, floor);
      addBody(world, enemy);
      
      expect(getBodyCount(world)).toBe(3);
      expect(hasBody(world, player.id)).toBe(true);
      expect(hasBody(world, floor.id)).toBe(true);
      expect(hasBody(world, enemy.id)).toBe(true);
      
      // Remove enemy
      removeBody(world, enemy.id);
      
      expect(getBodyCount(world)).toBe(2);
      expect(hasBody(world, enemy.id)).toBe(false);
      
      // Clear all
      clear(world);
      
      expect(getBodyCount(world)).toBe(0);
    });
  });
});

