import type { Body } from './Body.js';
import type { Vector2 } from '../core/Vector2.js';

/**
 * Narrows which bodies a world query considers.
 */
export interface QueryFilter {
  /**
   * Layer mask: only bodies whose `layer` shares a bit with it are included
   * (default: all layers).
   * @example { collidesWith: Layers.WORLD | Layers.ENEMY }
   */
  collidesWith?: number;

  /**
   * Include sensor bodies (default: true for queryPoint/queryAABB, false for
   * raycast, so trigger zones don't block line of sight).
   */
  includeSensors?: boolean;

  /** Extra test: return false to skip a body. */
  predicate?: (body: Body) => boolean;
}

/**
 * Options for a raycast.
 */
export interface RaycastOptions {
  /** Ray start in world space */
  origin: Vector2;

  /** Ray direction (any non-zero length; it is normalized) */
  direction: Vector2;

  /** Maximum distance along the ray (default: Infinity) */
  maxDistance?: number;

  /** Which bodies the ray can hit */
  filter?: QueryFilter;
}

/**
 * The closest body a ray hit.
 */
export interface RaycastHit {
  /** The body that was hit */
  body: Body;

  /** Hit point on the body's surface, in world space */
  point: Vector2;

  /** Unit surface normal at the hit point, pointing out of the body (toward the ray origin side) */
  normal: Vector2;

  /** Distance from the origin to the hit point */
  distance: number;
}
