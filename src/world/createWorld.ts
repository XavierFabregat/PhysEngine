import type { World } from '../types/World.js';
import type { Vector2 } from '../core/Vector2.js';
import type { Integrator } from '../types/Integrator.js';
import { VerletIntegrator } from '../systems/integrators/Verlet.js';

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
}

/**
 * Default world configuration.
 */
const DEFAULT_CONFIG: Required<WorldConfig> = {
  gravity: { x: 0, y: 400 },
  integrator: new VerletIntegrator(),
};

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
  // Shallow-copy gravity to avoid sharing the default config object
  const gravity = config.gravity ?? { ...DEFAULT_CONFIG.gravity };
  const integrator = config.integrator ?? DEFAULT_CONFIG.integrator;

  return {
    bodies: [],
    gravity,
    time: 0,
    integrator,
  };
};

