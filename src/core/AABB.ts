import type { Vector2 } from './Vector2';

/**
 * Axis-Aligned Bounding Box - a rectangle aligned with the coordinate axes.
 * Defined by minimum and maximum corner points.
 */
export interface AABB {
  /** The minimum corner (bottom-left in standard coordinates) */
  min: Vector2;
  /** The maximum corner (top-right in standard coordinates) */
  max: Vector2;
}

