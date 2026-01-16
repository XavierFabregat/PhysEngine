import { describe, it, expect, beforeEach } from 'vitest';
import { BruteForceBroadPhase } from './BruteForce';
import { createCircle, resetBodyIdCounter } from '../../bodies/createCircle';
import { createRectangle } from '../../bodies/createRectangle';
import { BodyType } from '../../types/BodyType';

describe('BruteForceBroadPhase', () => {
  let broadPhase: BruteForceBroadPhase;

  beforeEach(() => {
    broadPhase = new BruteForceBroadPhase();
    resetBodyIdCounter();
  });

  describe('basic pair finding', () => {
    it('should return empty array for no bodies', () => {
      const pairs = broadPhase.getPairs([]);
      
      expect(pairs).toEqual([]);
    });

    it('should return empty array for single body', () => {
      const body = createCircle({ radius: 10 });
      const pairs = broadPhase.getPairs([body]);
      
      expect(pairs).toEqual([]);
    });

    it('should find pair when two bodies overlap', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const bodyB = createCircle({
        position: { x: 5, y: 0 },
        radius: 10
      });
      
      const pairs = broadPhase.getPairs([bodyA, bodyB]);
      
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toEqual([0, 1]);
    });

    it('should not find pair when bodies are separated', () => {
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10
      });
      const bodyB = createCircle({
        position: { x: 100, y: 100 },
        radius: 10
      });
      
      const pairs = broadPhase.getPairs([bodyA, bodyB]);
      
      expect(pairs).toEqual([]);
    });
  });

  describe('multiple bodies', () => {
    it('should find all overlapping pairs', () => {
      const bodies = [
        createCircle({ position: { x: 0, y: 0 }, radius: 10 }),    // 0
        createCircle({ position: { x: 5, y: 0 }, radius: 10 }),    // 1 - overlaps with 0
        createCircle({ position: { x: 10, y: 0 }, radius: 10 }),   // 2 - overlaps with 0, 1
        createCircle({ position: { x: 100, y: 0 }, radius: 10 }),  // 3 - isolated
      ];
      
      const pairs = broadPhase.getPairs(bodies);
      
      // AABBs: 0=[-10,10], 1=[-5,15], 2=[0,20]
      // 0-1 overlap, 0-2 overlap, 1-2 overlap = 3 pairs
      expect(pairs).toHaveLength(3);
      expect(pairs).toContainEqual([0, 1]);
      expect(pairs).toContainEqual([0, 2]);
      expect(pairs).toContainEqual([1, 2]);
    });

    it('should not create duplicate pairs', () => {
      const bodies = [
        createCircle({ position: { x: 0, y: 0 }, radius: 10 }),
        createCircle({ position: { x: 5, y: 0 }, radius: 10 }),
      ];
      
      const pairs = broadPhase.getPairs(bodies);
      
      // Should only have [0, 1], not also [1, 0]
      expect(pairs).toHaveLength(1);
      expect(pairs[0][0]).toBeLessThan(pairs[0][1]);
    });

    it('should find complex overlap scenarios', () => {
      // Create cluster where body 0 overlaps all others
      const center = createCircle({ position: { x: 0, y: 0 }, radius: 20 });
      const surrounding = [
        createCircle({ position: { x: 15, y: 0 }, radius: 10 }),
        createCircle({ position: { x: 0, y: 15 }, radius: 10 }),
        createCircle({ position: { x: -15, y: 0 }, radius: 10 }),
      ];
      
      const bodies = [center, ...surrounding];
      const pairs = broadPhase.getPairs(bodies);
      
      // Center (0) overlaps with all three surrounding (1, 2, 3)
      // Some surrounding bodies also overlap with each other
      expect(pairs.length).toBeGreaterThanOrEqual(3);
      expect(pairs).toContainEqual([0, 1]);
      expect(pairs).toContainEqual([0, 2]);
      expect(pairs).toContainEqual([0, 3]);
    });
  });

  describe('static body filtering', () => {
    it('should skip static-static pairs', () => {
      const staticA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        type: BodyType.STATIC
      });
      const staticB = createCircle({
        position: { x: 5, y: 0 },
        radius: 10,
        type: BodyType.STATIC
      });
      
      const pairs = broadPhase.getPairs([staticA, staticB]);
      
      // Static bodies never collide with each other
      expect(pairs).toEqual([]);
    });

    it('should find static-dynamic pairs', () => {
      const staticBody = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        type: BodyType.STATIC
      });
      const dynamicBody = createCircle({
        position: { x: 5, y: 0 },
        radius: 10,
        type: BodyType.DYNAMIC
      });
      
      const pairs = broadPhase.getPairs([staticBody, dynamicBody]);
      
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toEqual([0, 1]);
    });

    it('should find kinematic-dynamic pairs', () => {
      const kinematicBody = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        type: BodyType.KINEMATIC
      });
      const dynamicBody = createCircle({
        position: { x: 5, y: 0 },
        radius: 10,
        type: BodyType.DYNAMIC
      });
      
      const pairs = broadPhase.getPairs([kinematicBody, dynamicBody]);
      
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toEqual([0, 1]);
    });
  });

  describe('collision filtering', () => {
    it('should respect collision layers', () => {
      const LAYER_A = 1 << 0;  // Layer 1
      const LAYER_B = 1 << 1;  // Layer 2
      
      const bodyA = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        layer: LAYER_A,
        collidesWith: LAYER_A  // Only collides with same layer
      });
      
      const bodyB = createCircle({
        position: { x: 5, y: 0 },
        radius: 10,
        layer: LAYER_B,
        collidesWith: LAYER_B  // Only collides with same layer
      });
      
      const pairs = broadPhase.getPairs([bodyA, bodyB]);
      
      // Different layers, shouldn't collide
      expect(pairs).toEqual([]);
    });

    it('should detect sensors', () => {
      const sensor = createCircle({
        position: { x: 0, y: 0 },
        radius: 10,
        isSensor: true,
        collidesWith: 0  // Normally wouldn't collide with anything
      });
      
      const body = createCircle({
        position: { x: 5, y: 0 },
        radius: 10,
        collidesWith: 0  // Normally wouldn't collide with anything
      });
      
      const pairs = broadPhase.getPairs([sensor, body]);
      
      // Sensors always detect (even with collidesWith = 0)
      expect(pairs).toHaveLength(1);
    });
  });

  describe('performance characteristics', () => {
    it('should handle many bodies efficiently', () => {
      // Create 100 bodies in a grid (most not overlapping)
      const bodies = [];
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          bodies.push(createCircle({
            position: { x: i * 50, y: j * 50 },
            radius: 10
          }));
        }
      }
      
      const start = performance.now();
      const pairs = broadPhase.getPairs(bodies);
      const elapsed = performance.now() - start;
      
      // Should be fast for 100 bodies (<5ms)
      expect(elapsed).toBeLessThan(5);
      
      // Most bodies shouldn't overlap (grid spacing 50, radius 10)
      expect(pairs.length).toBeLessThan(20);
    });

    it('should return pairs in consistent order', () => {
      const bodies = [
        createCircle({ position: { x: 0, y: 0 }, radius: 10 }),
        createCircle({ position: { x: 5, y: 0 }, radius: 10 }),
        createCircle({ position: { x: 10, y: 0 }, radius: 10 }),
      ];
      
      const pairs1 = broadPhase.getPairs(bodies);
      const pairs2 = broadPhase.getPairs(bodies);
      
      // Should be deterministic
      expect(pairs1).toEqual(pairs2);
    });
  });
});

