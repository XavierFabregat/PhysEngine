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
  /** Vertices in local space (must be convex and counter-clockwise) */
  vertices: readonly Vector2[];
}

/**
 * Discriminated union of all shape types.
 * Allows type-safe shape handling.
 */
export type Shape = CircleShape | RectangleShape | PolygonShape;

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

