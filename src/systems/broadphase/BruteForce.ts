import type { BroadPhase, BodyPair } from '../../types/BroadPhase.js';
import type { Body } from '../../types/Body.js';
import { shouldCollide } from '../../types/Body.js';
import * as AABB from '../../core/AABB.js';

/**
 * Brute force broad phase collision detection.
 * 
 * Checks every body against every other body using AABB overlap tests.
 * Simple O(n²) algorithm that works well for small to medium body counts.
 * 
 * Performance characteristics:
 * - Time complexity: O(n²) where n = number of bodies
 * - Space complexity: O(n²) worst case (all bodies overlapping)
 * - Fast for <200 bodies (~1-2ms)
 * - Acceptable for <500 bodies (~5-10ms)
 * - Slow for >500 bodies (consider SpatialHashBroadPhase)
 * 
 * Optimizations:
 * - Early-out for collision filtering (layers/masks)
 * - Only checks each pair once (i < j)
 * - Skips static-static pairs (they never collide with each other)
 * 
 * @example
 * const broadPhase = new BruteForceBroadPhase();
 * const world = createWorld({ broadPhase });
 */
export class BruteForceBroadPhase implements BroadPhase {
  /**
   * Finds all pairs of bodies whose AABBs overlap.
   * 
   * @param bodies - All bodies in the world
   * @returns Array of body index pairs that might be colliding
   */
  getPairs(bodies: readonly Body[]): BodyPair[] {
    const pairs: BodyPair[] = [];

    // Check every unique pair (i < j to avoid duplicates)
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const bodyA = bodies[i];
        const bodyB = bodies[j];

        // Type guard - should never happen but TypeScript needs it
        if (!bodyA || !bodyB) continue;

        // Skip if both are static (static bodies don't collide with each other)
        if (bodyA.type === 'static' && bodyB.type === 'static') {
          continue;
        }

        // Check collision filtering (layers/masks/sensors)
        if (!shouldCollide(bodyA, bodyB)) {
          continue;
        }

        // Check AABB overlap (the actual broad phase test)
        if (AABB.overlaps(bodyA.aabb, bodyB.aabb)) {
          pairs.push([i, j] as const);
        }
      }
    }

    return pairs;
  }
}

