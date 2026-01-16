import type { World } from '../types/World.js';
import type { Vector2 } from '../core/Vector2.js';
import type { Integrator } from '../types/Integrator.js';
import type { BroadPhase } from '../types/BroadPhase.js';
import type { CollisionResolver } from '../types/CollisionResolver.js';
import { VerletIntegrator } from '../systems/integrators/Verlet.js';
import { BruteForceBroadPhase } from '../systems/broadphase/BruteForce.js';
import { ImpulseResolver } from '../systems/resolvers/ImpulseResolver.js';

/**
 * Configuration for creating a physics world.
 */
export interface WorldConfig {
  /**
   * Global gravity acceleration vector (m/s²).
   * Default: { x: 0, y: 400 } (downward, good for games at 800x600 screen)
   */
  gravity?: Vector2;

  /**
   * Integrator for numerical integration.
   * Default: VerletIntegrator (stable, good for games)
   * 
   * Swap for different behavior:
   * - VerletIntegrator: Stable, position-based (default)
   * - EulerIntegrator: Fast, less accurate (future)
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
   * Collision resolver for collision response.
   * Default: ImpulseResolver (industry standard)
   * 
   * Swap for different behavior:
   * - ImpulseResolver: Accurate, handles friction well (default)
   * - PositionResolver: Simple, good for simple games (future)
   * - IterativeResolver: More accurate, slower (future)
   */
  resolver?: CollisionResolver;
}

/**
 * Default world configuration factory.
 * Creates new instances to avoid sharing between worlds.
 */
const getDefaultConfig = (): Required<WorldConfig> => ({
  gravity: { x: 0, y: 400 },
  integrator: new VerletIntegrator(),
  broadPhase: new BruteForceBroadPhase(),
  resolver: new ImpulseResolver(),
});

/**
 * Creates a new physics world.
 * 
 * The world is the main container for all physics simulation.
 * It holds all bodies, global settings, and pluggable systems.
 * 
 * @param config - World configuration
 * @returns A new World instance
 * @example
 * // Create world with defaults (Verlet integrator)
 * const world = createWorld();
 * 
 * // Create world with custom gravity
 * const world = createWorld({
 *   gravity: { x: 0, y: 9.81 }  // Earth gravity (m/s²)
 * });
 * 
 * // Create world with custom integrator
 * const world = createWorld({
 *   integrator: new EulerIntegrator()
 * });
 */
export const createWorld = (config: WorldConfig = {}): World => {
  const defaults = getDefaultConfig();
  
  // Shallow-copy gravity to avoid sharing the default config object
  const gravity = config.gravity ?? { ...defaults.gravity };
  const integrator = config.integrator ?? defaults.integrator;
  const broadPhase = config.broadPhase ?? defaults.broadPhase;
  const resolver = config.resolver ?? defaults.resolver;

  return {
    bodies: [],
    gravity,
    time: 0,
    integrator,
    broadPhase,
    resolver,
  };
};

