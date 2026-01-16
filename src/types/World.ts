import type { Body } from './Body.js';
import type { Vector2 } from '../core/Vector2.js';
import type { Integrator } from './Integrator.js';

/**
 * The physics world - container for all bodies and simulation settings.
 * 
 * The world is mutable for performance (physics engines update 60+ times per second).
 * Bodies within the world should be treated as immutable data.
 */
export interface World {
  /**
   * All rigid bodies in the simulation.
   * Mutated directly during simulation (add/remove bodies, integration, collision).
   */
  bodies: Body[];

  /**
   * Global gravity acceleration vector (m/s²).
   * Applied to all dynamic bodies each frame.
   * Common values:
   * - Earth: { x: 0, y: 9.81 } (downward)
   * - Moon: { x: 0, y: 1.62 }
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
   * Pluggable system - can swap Verlet, Euler, RK4, or custom implementations.
   */
  integrator: Integrator;
}

