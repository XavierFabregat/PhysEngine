import type { Body } from './Body.js';

/**
 * A pair of body indices that might be colliding.
 * Indices reference bodies in the World.bodies array.
 */
export type BodyPair = readonly [number, number];

/**
 * Broad phase collision detection interface.
 * 
 * The broad phase quickly filters body pairs to find potentially colliding bodies.
 * It uses cheap tests (typically AABB overlap) to eliminate obviously non-colliding pairs.
 * 
 * This is the first stage of collision detection:
 * 1. Broad phase: Fast filter (AABB overlap) → potential pairs
 * 2. Narrow phase: Precise check (geometry) → actual collisions
 * 
 * Different broad phase implementations offer different trade-offs:
 * - BruteForce: O(n²), simple, good for <200 bodies
 * - SpatialHash: O(n), complex, good for >200 bodies
 * - QuadTree: O(n log n), dynamic spatial partitioning
 */
export interface BroadPhase {
  /**
   * Finds all pairs of bodies that might be colliding.
   * 
   * Returns pairs where AABBs overlap. These are candidates for
   * precise narrow-phase collision detection.
   * 
   * @param bodies - All bodies in the world
   * @returns Array of body index pairs [(i, j), ...] where i < j
   * 
   * @example
   * const pairs = broadPhase.getPairs(world.bodies);
   * // pairs = [[0, 3], [1, 4], [2, 3]]
   * // Means: check bodies[0] vs bodies[3], etc.
   */
  getPairs(bodies: readonly Body[]): BodyPair[];
}

