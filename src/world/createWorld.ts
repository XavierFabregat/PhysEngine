import type { World } from '../types/World.js';
import type { Vector2 } from '../core/Vector2.js';
import type { Integrator } from '../types/Integrator.js';
import type { BroadPhase } from '../types/BroadPhase.js';
import type { NarrowPhase } from '../types/NarrowPhase.js';
import type { CollisionResolver } from '../types/CollisionResolver.js';
import { SemiImplicitEulerIntegrator } from '../systems/integrators/SemiImplicitEuler.js';
import { BruteForceBroadPhase } from '../systems/broadphase/BruteForce.js';
import { ShapeDispatchNarrowPhase } from '../systems/narrowphase/ShapeDispatchNarrowPhase.js';
import { ImpulseResolver } from '../systems/resolvers/ImpulseResolver.js';

/**
 * Configuration for creating a physics world.
 */
export interface WorldConfig {
  /**
   * Global gravity acceleration vector (world units/s²).
   * Default: { x: 0, y: 400 } (downward in y-down screen coordinates;
   * tuned for pixel units on an ~800x600 canvas)
   */
  gravity?: Vector2;

  /**
   * Integrator for numerical integration.
   * Default: a new SemiImplicitEulerIntegrator per world (stable, good for games)
   * 
   * Swap for different behavior:
   * - SemiImplicitEulerIntegrator: Symplectic, stable, first order (default)
   * - RK4Integrator: Accurate, expensive (future)
   */
  integrator?: Integrator;

  /**
   * Broad phase collision detection system.
   * Default: BruteForceBroadPhase (simple O(n²), good for <200 bodies)
   * 
   * Swap for better performance:
   * - BruteForceBroadPhase: Simple, <200 bodies (default)
   * - SpatialHashBroadPhase: Fast, >200 bodies (future)
   * - QuadTreeBroadPhase: Dynamic spatial partitioning (future)
   */
  broadPhase?: BroadPhase;

  /**
   * Narrow phase collision detection system.
   * Default: ShapeDispatchNarrowPhase (all built-in shape pairs: circle,
   * rectangle and convex polygon; polygons and rectangles via SAT)
   *
   * Extend it with `register(typeA, typeB, detector)` or swap in any
   * implementation of the NarrowPhase interface.
   */
  narrowPhase?: NarrowPhase;

  /**
   * Collision resolver for collision response.
   * Default: ImpulseResolver (industry standard)
   * 
   * Swap for different behavior:
   * - ImpulseResolver: Restitution + positional correction, linear only (default).
   *   Pass `new ImpulseResolver({ restitutionCombine: 'max' })` to change how
   *   two bodies' restitution combine ('min' default, 'max', 'average', 'multiply', or a function)
   * - PositionResolver: Simple, good for simple games (future)
   * - IterativeResolver: More accurate, slower (future)
   */
  resolver?: CollisionResolver;
}

/**
 * Default gravity (y-down screen coordinates, pixel units).
 */
const DEFAULT_GRAVITY: Readonly<Vector2> = Object.freeze({ x: 0, y: 400 });

/**
 * Creates a new physics world.
 * 
 * The world is the main container for all physics simulation.
 * It holds all bodies, global settings, and pluggable systems.
 * 
 * @param config - World configuration
 * @returns A new World instance
 * @example
 * // Create world with defaults (semi-implicit Euler integrator)
 * const world = createWorld();
 * 
 * // Create world with custom gravity
 * const world = createWorld({
 *   gravity: { x: 0, y: 9.81 }  // Earth gravity (m/s²)
 * });
 * 
 * // Create world with custom integrator
 * const world = createWorld({
 *   integrator: new SemiImplicitEulerIntegrator()  // or any custom Integrator
 * });
 */
export const createWorld = (config: WorldConfig = {}): World => {
  // Copy gravity so the world never aliases the caller's (or the default) object
  const gravity = { ...(config.gravity ?? DEFAULT_GRAVITY) };
  // Fresh system instances per world so stateful systems are never shared
  const integrator = config.integrator ?? new SemiImplicitEulerIntegrator();
  const broadPhase = config.broadPhase ?? new BruteForceBroadPhase();
  const narrowPhase = config.narrowPhase ?? new ShapeDispatchNarrowPhase();
  const resolver = config.resolver ?? new ImpulseResolver();

  return {
    bodies: [],
    gravity,
    time: 0,
    integrator,
    broadPhase,
    narrowPhase,
    resolver,
  };
};

