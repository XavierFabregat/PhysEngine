import type { Vector2 } from '../core/Vector2.js';

/**
 * Circle shape.
 */
export interface CircleShape {
  type: 'circle';
  /** Radius of the circle */
  radius: number;
}

/**
 * Rectangle shape (axis-aligned in local space).
 * Vertices have positive winding (signed area > 0): top-left, top-right,
 * bottom-right, bottom-left on a y-down screen.
 */
export interface RectangleShape {
  type: 'rectangle';
  /** Width of the rectangle */
  width: number;
  /** Height of the rectangle */
  height: number;
  /** Vertices in local space (computed from width/height) */
  vertices: readonly [Vector2, Vector2, Vector2, Vector2];
}

/**
 * Convex polygon shape.
 */
export interface PolygonShape {
  type: 'polygon';
  /**
   * Vertices in local space, relative to the center of mass.
   * Must be convex with positive winding (signed area > 0): counter-clockwise
   * in y-up math axes, which appears clockwise on a y-down screen.
   */
  vertices: readonly Vector2[];
}

/**
 * Chain shape: a static polyline (terrain, drawn lines, level outlines).
 * Has no area or mass, so chain bodies must be static or kinematic. Segments
 * are two-sided; a ball rolls across the joints without catching on them.
 */
export interface ChainShape {
  type: 'chain';
  /** Polyline points in local space (at least 2) */
  vertices: readonly Vector2[];
  /** If true, the last point connects back to the first */
  loop: boolean;
}

/**
 * Discriminated union of all shape types.
 * Allows type-safe shape handling.
 */
export type Shape = CircleShape | RectangleShape | PolygonShape | ChainShape;

/**
 * Type guard to check if shape is a circle.
 */
export const isCircle = (shape: Shape): shape is CircleShape =>
  shape.type === 'circle';

/**
 * Type guard to check if shape is a rectangle.
 */
export const isRectangle = (shape: Shape): shape is RectangleShape =>
  shape.type === 'rectangle';

/**
 * Type guard to check if shape is a polygon.
 */
export const isPolygon = (shape: Shape): shape is PolygonShape =>
  shape.type === 'polygon';

/**
 * Type guard to check if shape is a chain.
 */
export const isChain = (shape: Shape): shape is ChainShape =>
  shape.type === 'chain';
