import type { Vector2 } from './Vector2';

/**
 * Represents a 2D transformation (position and rotation).
 * Transforms define how to convert between local space (body-relative)
 * and world space (absolute coordinates).
 */
export interface Transform {
  /** Position in world space */
  position: Vector2;
  /** Rotation angle in radians (counter-clockwise from positive x-axis) */
  rotation: number;
}

// ============================================================
// CREATION
// ============================================================

/**
 * Creates a new transform.
 * @param position - The position vector in world space
 * @param rotation - The rotation angle in radians (default: 0)
 * @returns A new Transform
 * @example
 * const t = create({ x: 100, y: 50 }, Math.PI / 4);
 */
export const create = (position: Vector2, rotation = 0): Transform => ({
  position,
  rotation,
});

/**
 * Creates an identity transform (origin position, no rotation).
 * This represents a body at the world origin with no rotation.
 * @returns A transform at (0, 0) with 0 rotation
 */
export const identity = (): Transform => ({
  position: { x: 0, y: 0 },
  rotation: 0,
});

/**
 * Creates a copy of a transform.
 * @param transform - The transform to clone
 * @returns A new transform with the same values
 */
export const clone = (transform: Transform): Transform => ({
  position: { x: transform.position.x, y: transform.position.y },
  rotation: transform.rotation,
});

// ============================================================
// SPACE CONVERSION
// ============================================================

/**
 * Transforms a point from local space to world space.
 * Math: Apply rotation matrix, then translate
 *   x_world = x_local * cos(θ) - y_local * sin(θ) + pos.x
 *   y_world = x_local * sin(θ) + y_local * cos(θ) + pos.y
 * 
 * Use this to find where a body's vertices are in the world.
 * @param transform - The transform to apply
 * @param localPoint - The point in local space (relative to body center)
 * @returns The point in world space (absolute coordinates)
 * @example
 * // Body at (100, 50) rotated 45°
 * const t = create({ x: 100, y: 50 }, Math.PI / 4);
 * // Corner at (-10, -10) in local space
 * const worldPos = transformPoint(t, { x: -10, y: -10 });
 */
export const transformPoint = (
  transform: Transform,
  localPoint: Vector2
): Vector2 => {
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  return {
    x: localPoint.x * cos - localPoint.y * sin + transform.position.x,
    y: localPoint.x * sin + localPoint.y * cos + transform.position.y,
  };
};

/**
 * Transforms a point from world space to local space.
 * Math: Translate, then apply inverse rotation
 *   dx = x_world - pos.x
 *   dy = y_world - pos.y
 *   x_local = dx * cos(-θ) - dy * sin(-θ)
 *   y_local = dx * sin(-θ) + dy * cos(-θ)
 * 
 * Use this for hit testing: "Did I click on this body?"
 * @param transform - The transform
 * @param worldPoint - The point in world space
 * @returns The point in local space
 * @example
 * // Check if mouse click is inside body's local bounds
 * const localClick = inverseTransformPoint(bodyTransform, mousePos);
 */
export const inverseTransformPoint = (
  transform: Transform,
  worldPoint: Vector2
): Vector2 => {
  const dx = worldPoint.x - transform.position.x;
  const dy = worldPoint.y - transform.position.y;
  const cos = Math.cos(-transform.rotation);
  const sin = Math.sin(-transform.rotation);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
};

/**
 * Transforms a direction vector from local to world space.
 * Like transformPoint but ignores position (directions don't have location).
 * Math: Apply rotation matrix only
 *   x_world = x_local * cos(θ) - y_local * sin(θ)
 *   y_world = x_local * sin(θ) + y_local * cos(θ)
 * 
 * Use this for velocity vectors, normals, or any direction.
 * @param transform - The transform
 * @param localDirection - The direction in local space
 * @returns The direction in world space
 * @example
 * // Body's local "forward" direction
 * const localForward = { x: 1, y: 0 };
 * // What world direction is that?
 * const worldForward = transformDirection(bodyTransform, localForward);
 */
export const transformDirection = (
  transform: Transform,
  localDirection: Vector2
): Vector2 => {
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  return {
    x: localDirection.x * cos - localDirection.y * sin,
    y: localDirection.x * sin + localDirection.y * cos,
  };
};

/**
 * Transforms a direction vector from world to local space.
 * Inverse of transformDirection.
 * @param transform - The transform
 * @param worldDirection - The direction in world space
 * @returns The direction in local space
 * @example
 * // Convert world velocity to local space for body-relative calculations
 * const localVelocity = inverseTransformDirection(transform, worldVelocity);
 */
export const inverseTransformDirection = (
  transform: Transform,
  worldDirection: Vector2
): Vector2 => {
  const cos = Math.cos(-transform.rotation);
  const sin = Math.sin(-transform.rotation);
  return {
    x: worldDirection.x * cos - worldDirection.y * sin,
    y: worldDirection.x * sin + worldDirection.y * cos,
  };
};

// ============================================================
// TRANSFORM OPERATIONS
// ============================================================

/**
 * Composes two transforms (combines them).
 * Math: Result = apply 'a', then apply 'b'
 * 
 * Used for hierarchical transforms (parent-child relationships).
 * Example: Car (transform A) has wheel (transform B), where is wheel in world?
 * 
 * @param a - The first transform (parent)
 * @param b - The second transform (child, in parent's local space)
 * @returns The combined transform (child in world space)
 * @example
 * const carTransform = create({ x: 100, y: 100 }, 0);
 * const wheelOffsetLocal = create({ x: 20, y: 0 }, Math.PI / 4);
 * const wheelWorld = compose(carTransform, wheelOffsetLocal);
 */
export const compose = (a: Transform, b: Transform): Transform => {
  // First rotate b's position by a's rotation, then add a's position
  const cos = Math.cos(a.rotation);
  const sin = Math.sin(a.rotation);
  return {
    position: {
      x: b.position.x * cos - b.position.y * sin + a.position.x,
      y: b.position.x * sin + b.position.y * cos + a.position.y,
    },
    rotation: a.rotation + b.rotation,
  };
};

/**
 * Computes the inverse of a transform.
 * Math: Transform that "undoes" the original transform
 * 
 * Useful for converting from world to local space efficiently.
 * @param transform - The transform to invert
 * @returns The inverse transform
 * @example
 * const t = create({ x: 100, y: 50 }, Math.PI / 4);
 * const invT = inverse(t);
 * // transformPoint(invT, worldPoint) === inverseTransformPoint(t, worldPoint)
 */
export const inverse = (transform: Transform): Transform => {
  const cos = Math.cos(-transform.rotation);
  const sin = Math.sin(-transform.rotation);
  const negatedPos = {
    x: -transform.position.x,
    y: -transform.position.y,
  };
  return {
    position: {
      x: negatedPos.x * cos - negatedPos.y * sin,
      y: negatedPos.x * sin + negatedPos.y * cos,
    },
    rotation: -transform.rotation,
  };
};

// ============================================================
// UTILITIES
// ============================================================

/**
 * Checks if two transforms are approximately equal.
 * Uses epsilon tolerance for floating-point comparison.
 * @param a - The first transform
 * @param b - The second transform
 * @param epsilon - Position tolerance (default: 1e-10)
 * @param angleEpsilon - Angle tolerance in radians (default: 1e-10)
 * @returns True if transforms are approximately equal
 */
export const equals = (
  a: Transform,
  b: Transform,
  epsilon = 1e-10,
  angleEpsilon = 1e-10
): boolean => {
  return (
    Math.abs(a.position.x - b.position.x) < epsilon &&
    Math.abs(a.position.y - b.position.y) < epsilon &&
    Math.abs(a.rotation - b.rotation) < angleEpsilon
  );
};

/**
 * Converts a transform to a string representation.
 * @param transform - The transform to convert
 * @returns A string in the format "pos: (x, y), rot: r rad"
 */
export const toString = (transform: Transform): string => {
  return `pos: (${transform.position.x}, ${transform.position.y}), rot: ${transform.rotation} rad`;
};
