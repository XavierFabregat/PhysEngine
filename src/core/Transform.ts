import type { Vector2 } from './Vector2';

/**
 * Represents a 2D transformation (position and rotation).
 */
export interface Transform {
  /** Position in 2D space */
  position: Vector2;
  /** Rotation angle in radians (counter-clockwise from positive x-axis) */
  rotation: number;
}

