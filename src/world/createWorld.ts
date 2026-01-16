import type { World } from '../types/World.js';
import type { Vector2 } from '../core/Vector2.js';

/**
 * Configuration for creating a physics world.
 */
export interface WorldConfig {
  /**
   * Global gravity acceleration vector (m/s²).
   * Default: { x: 0, y: 400 } (downward, good for games at 800x600 screen)
   */
  gravity?: Vector2;
}

/**
 * Default world configuration.
 */
const DEFAULT_CONFIG: Required<WorldConfig> = {
  gravity: { x: 0, y: 400 },
};

/**
 * Creates a new physics world.
 * 
 * The world is the main container for all physics simulation.
 * It holds all bodies and global settings like gravity.
 * 
 * @param config - World configuration
 * @returns A new World instance
 * @example
 * // Create world with default gravity
 * const world = createWorld();
 * 
 * // Create world with custom gravity
 * const world = createWorld({
 *   gravity: { x: 0, y: 9.81 }  // Earth gravity (m/s²)
 * });
 * 
 * // Create world with no gravity (space)
 * const spaceWorld = createWorld({
 *   gravity: { x: 0, y: 0 }
 * });
 */
export const createWorld = (config: WorldConfig = {}): World => {
  const { gravity = DEFAULT_CONFIG.gravity } = config;

  return {
    bodies: [],
    gravity,
    time: 0,
  };
};

