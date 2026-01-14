import type { Vector2 } from './Vector2';

/**
 * Axis-Aligned Bounding Box - a rectangle aligned with the coordinate axes.
 * Defined by minimum and maximum corner points.
 * 
 * AABBs are used for fast broad-phase collision detection. They never rotate,
 * making overlap tests extremely cheap (just 4 comparisons).
 */
export interface AABB {
  /** The minimum corner (bottom-left in standard coordinates) */
  min: Vector2;
  /** The maximum corner (top-right in standard coordinates) */
  max: Vector2;
}

// ============================================================
// CREATION
// ============================================================

/**
 * Creates an AABB from minimum and maximum points.
 * @param min - The minimum corner (smallest x and y)
 * @param max - The maximum corner (largest x and y)
 * @returns A new AABB
 * @example
 * const aabb = create({ x: 0, y: 0 }, { x: 100, y: 50 });
 */
export const create = (min: Vector2, max: Vector2): AABB => ({ min, max });

/**
 * Creates an AABB from a center point and half-extents.
 * Math: min = center - halfExtents, max = center + halfExtents
 * @param center - The center point of the box
 * @param halfExtents - Half the width and height (distance from center to edge)
 * @returns A new AABB
 * @example
 * // Create 100x60 box centered at (50, 30)
 * const aabb = fromCenter({ x: 50, y: 30 }, { x: 50, y: 30 });
 */
export const fromCenter = (center: Vector2, halfExtents: Vector2): AABB => ({
  min: { x: center.x - halfExtents.x, y: center.y - halfExtents.y },
  max: { x: center.x + halfExtents.x, y: center.y + halfExtents.y },
});

/**
 * Creates an AABB that encompasses a set of points.
 * Useful for creating bounding boxes around arbitrary shapes.
 * @param points - Array of points to bound
 * @returns An AABB containing all points
 * @throws Error if points array is empty
 */
export const fromPoints = (points: readonly Vector2[]): AABB => {
  if (points.length === 0) {
    throw new Error('Cannot create AABB from empty points array');
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  };
};

/**
 * Creates a copy of an AABB.
 * @param aabb - The AABB to clone
 * @returns A new AABB with the same bounds
 */
export const clone = (aabb: AABB): AABB => ({
  min: { x: aabb.min.x, y: aabb.min.y },
  max: { x: aabb.max.x, y: aabb.max.y },
});

// ============================================================
// COLLISION DETECTION
// ============================================================

/**
 * Checks if two AABBs overlap using the Separating Axis Theorem for AABBs.
 * Math: Boxes overlap if they overlap on BOTH x and y axes
 *   X-axis overlap: a.min.x ≤ b.max.x AND a.max.x ≥ b.min.x
 *   Y-axis overlap: a.min.y ≤ b.max.y AND a.max.y ≥ b.min.y
 * 
 * This is the core broad-phase collision check - extremely fast!
 * @param a - The first AABB
 * @param b - The second AABB
 * @returns True if the AABBs overlap (touching counts as overlapping)
 */
export const overlaps = (a: AABB, b: AABB): boolean =>
  a.min.x <= b.max.x &&
  a.max.x >= b.min.x &&
  a.min.y <= b.max.y &&
  a.max.y >= b.min.y;

/**
 * Checks if an AABB contains a point.
 * Math: Point is inside if within bounds on both axes
 * @param aabb - The AABB
 * @param point - The point to test
 * @returns True if the point is inside or on the boundary
 */
export const contains = (aabb: AABB, point: Vector2): boolean =>
  point.x >= aabb.min.x &&
  point.x <= aabb.max.x &&
  point.y >= aabb.min.y &&
  point.y <= aabb.max.y;

/**
 * Checks if AABB 'a' fully contains AABB 'b'.
 * Math: B is inside A if all of B's bounds are within A's bounds
 * @param a - The potentially containing AABB
 * @param b - The AABB to test
 * @returns True if 'a' completely contains 'b'
 */
export const containsAABB = (a: AABB, b: AABB): boolean =>
  b.min.x >= a.min.x &&
  b.max.x <= a.max.x &&
  b.min.y >= a.min.y &&
  b.max.y <= a.max.y;

// ============================================================
// QUERIES
// ============================================================

/**
 * Computes the area of an AABB.
 * Math: width * height
 * @param aabb - The AABB
 * @returns The area of the box
 */
export const area = (aabb: AABB): number => {
  const width = aabb.max.x - aabb.min.x;
  const height = aabb.max.y - aabb.min.y;
  return width * height;
};

/**
 * Computes the perimeter of an AABB.
 * Math: 2 * (width + height)
 * Useful for heuristics in spatial data structures (e.g., dynamic AABB trees).
 * @param aabb - The AABB
 * @returns The perimeter of the box
 */
export const perimeter = (aabb: AABB): number => {
  const width = aabb.max.x - aabb.min.x;
  const height = aabb.max.y - aabb.min.y;
  return 2 * (width + height);
};

/**
 * Computes the center point of an AABB.
 * Math: (min + max) / 2
 * @param aabb - The AABB
 * @returns The center point
 */
export const center = (aabb: AABB): Vector2 => ({
  x: (aabb.min.x + aabb.max.x) * 0.5,
  y: (aabb.min.y + aabb.max.y) * 0.5,
});

/**
 * Computes the half-extents (half width and half height) of an AABB.
 * Math: (max - min) / 2
 * @param aabb - The AABB
 * @returns The half-extents vector
 */
export const halfExtents = (aabb: AABB): Vector2 => ({
  x: (aabb.max.x - aabb.min.x) * 0.5,
  y: (aabb.max.y - aabb.min.y) * 0.5,
});

/**
 * Computes the width of an AABB.
 * @param aabb - The AABB
 * @returns The width (max.x - min.x)
 */
export const width = (aabb: AABB): number => aabb.max.x - aabb.min.x;

/**
 * Computes the height of an AABB.
 * @param aabb - The AABB
 * @returns The height (max.y - min.y)
 */
export const height = (aabb: AABB): number => aabb.max.y - aabb.min.y;

// ============================================================
// OPERATIONS
// ============================================================

/**
 * Merges two AABBs into one that contains both.
 * Math: Takes minimum of mins and maximum of maxes
 * Used to create bounding volumes for groups of objects.
 * @param a - The first AABB
 * @param b - The second AABB
 * @returns A new AABB containing both input AABBs
 */
export const merge = (a: AABB, b: AABB): AABB => ({
  min: {
    x: Math.min(a.min.x, b.min.x),
    y: Math.min(a.min.y, b.min.y),
  },
  max: {
    x: Math.max(a.max.x, b.max.x),
    y: Math.max(a.max.y, b.max.y),
  },
});

/**
 * Expands an AABB by a margin in all directions.
 * Useful for adding "safety padding" to prevent numerical errors in collision detection.
 * @param aabb - The AABB to expand
 * @param margin - The amount to expand by (can be negative to shrink)
 * @returns A new expanded AABB
 */
export const expand = (aabb: AABB, margin: number): AABB => ({
  min: { x: aabb.min.x - margin, y: aabb.min.y - margin },
  max: { x: aabb.max.x + margin, y: aabb.max.y + margin },
});

/**
 * Translates (moves) an AABB by an offset.
 * @param aabb - The AABB to translate
 * @param offset - The translation vector
 * @returns A new AABB moved by the offset
 */
export const translate = (aabb: AABB, offset: Vector2): AABB => ({
  min: { x: aabb.min.x + offset.x, y: aabb.min.y + offset.y },
  max: { x: aabb.max.x + offset.x, y: aabb.max.y + offset.y },
});

// ============================================================
// UTILITIES
// ============================================================

/**
 * Checks if two AABBs are approximately equal.
 * @param a - The first AABB
 * @param b - The second AABB
 * @param epsilon - The tolerance for comparison (default: 1e-10)
 * @returns True if the AABBs are approximately equal
 */
export const equals = (a: AABB, b: AABB, epsilon = 1e-10): boolean =>
  Math.abs(a.min.x - b.min.x) < epsilon &&
  Math.abs(a.min.y - b.min.y) < epsilon &&
  Math.abs(a.max.x - b.max.x) < epsilon &&
  Math.abs(a.max.y - b.max.y) < epsilon;

/**
 * Checks if an AABB is valid (min < max on both axes).
 * @param aabb - The AABB to validate
 * @returns True if the AABB is valid
 */
export const isValid = (aabb: AABB): boolean =>
  aabb.min.x <= aabb.max.x && aabb.min.y <= aabb.max.y;

/**
 * Converts an AABB to a string representation.
 * @param aabb - The AABB to convert
 * @returns A string in the format "min: (x, y), max: (x, y)"
 */
export const toString = (aabb: AABB): string =>
  `min: (${aabb.min.x}, ${aabb.min.y}), max: (${aabb.max.x}, ${aabb.max.y})`;
