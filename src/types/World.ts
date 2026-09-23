import type { Body } from './Body.js';
import type { Vector2 } from '../core/Vector2.js';
import type { Integrator } from './Integrator.js';
import type { BroadPhase } from './BroadPhase.js';
import type { NarrowPhase } from './NarrowPhase.js';
import type { CollisionResolver } from './CollisionResolver.js';

/**
 * The physics world - container for all bodies and simulation settings.
 * 
 * The world and its bodies are mutable for performance (physics engines
 * update 60+ times per second); step() updates bodies in place.
 */
export interface World {
  /**
   * All rigid bodies in the simulation.
   * Mutated directly during simulation (add/remove bodies, integration, collision).
   */
  bodies: Body[];

  /**
   * Global gravity acceleration vector (world units/s²).
   * Applied to all dynamic bodies each frame. The world is y-down, so
   * positive y pulls bodies down the screen.
   * Common values:
   * - Default: { x: 0, y: 400 } (pixel-scale games)
   * - Earth in meters: { x: 0, y: 9.81 }
   * - Space: { x: 0, y: 0 } (no gravity)
   * - Custom: { x: -5, y: 10 } (sideways gravity for platformers)
   */
  gravity: Vector2;

  /**
   * Accumulated simulation time in seconds.
   * Updated by step() function.
   * Useful for debugging and deterministic playback.
   */
  time: number;

  /**
   * Integrator for numerical integration of motion equations.
   * Pluggable system - defaults to SemiImplicitEulerIntegrator; any custom
   * implementation of the Integrator interface can be swapped in.
   */
  integrator: Integrator;

  /**
   * Broad phase collision detection system.
   * Quickly filters body pairs to find potential collisions using AABB overlap.
   * Pluggable system - can swap BruteForce, SpatialHash, QuadTree, etc.
   */
  broadPhase: BroadPhase;

  /**
   * Narrow phase collision detection system.
   * Precise shape-vs-shape tests for pairs the broad phase reports.
   * Pluggable system - defaults to ShapeDispatchNarrowPhase (every pair of
   * built-in shapes); register more detectors or swap in a custom one.
   */
  narrowPhase: NarrowPhase;

  /**
   * Collision resolver for collision response.
   * Handles what happens after collision detection (bouncing, friction, separation).
   * Pluggable system - can swap Impulse, Position, or custom resolvers.
   */
  resolver: CollisionResolver;
}

