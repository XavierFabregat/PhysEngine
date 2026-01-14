/**
 * A 2D vector represented as a plain object with x and y components.
 * All operations are immutable and return new vector instances.
 */
export type Vector2 = { x: number; y: number };

// ============================================================
// CREATION & BASIC OPERATIONS
// ============================================================

/**
 * Creates a new 2D vector.
 * @param x - The x-component
 * @param y - The y-component
 * @returns A new Vector2 instance
 * @example
 * const v = create(3, 4);
 */
export const create = (x: number, y: number): Vector2 => ({ x, y });

/**
 * Creates a zero vector (0, 0).
 * @returns A vector with both components set to zero
 */
export const zero = (): Vector2 => ({ x: 0, y: 0 });

/**
 * Creates a copy of a vector.
 * @param v - The vector to clone
 * @returns A new vector with the same components
 */
export const clone = (v: Vector2): Vector2 => ({ x: v.x, y: v.y });

/**
 * Adds two vectors component-wise.
 * Math: (a.x + b.x, a.y + b.y)
 * @param a - The first vector
 * @param b - The second vector
 * @returns The sum of the two vectors
 */
export const add = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

/**
 * Subtracts vector b from vector a component-wise.
 * Math: (a.x - b.x, a.y - b.y)
 * @param a - The vector to subtract from
 * @param b - The vector to subtract
 * @returns The difference between the two vectors
 */
export const sub = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

/**
 * Multiplies a vector by a scalar value.
 * Math: (v.x * s, v.y * s)
 * @param v - The vector to scale
 * @param s - The scalar multiplier
 * @returns A new vector scaled by the given factor
 */
export const scale = (v: Vector2, s: number): Vector2 => ({
  x: v.x * s,
  y: v.y * s,
});

/**
 * Negates a vector (reverses its direction).
 * Math: (-v.x, -v.y)
 * @param v - The vector to negate
 * @returns A vector pointing in the opposite direction
 */
export const negate = (v: Vector2): Vector2 => ({
  x: -v.x,
  y: -v.y,
});

// ============================================================
// VECTOR PRODUCTS
// ============================================================

/**
 * Computes the dot product (scalar product) of two vectors.
 * Math: a.x * b.x + a.y * b.y
 * Geometric interpretation: |a| * |b| * cos(θ) where θ is the angle between vectors.
 * Returns positive if angle < 90°, zero if perpendicular, negative if angle > 90°.
 * @param a - The first vector
 * @param b - The second vector
 * @returns The dot product (a scalar value)
 */
export const dot = (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y;

/**
 * Computes the 2D cross product (z-component of 3D cross product).
 * Math: a.x * b.y - a.y * b.x
 * Geometric interpretation: |a| * |b| * sin(θ) where θ is the angle between vectors.
 * Returns positive if b is counter-clockwise from a, negative if clockwise, zero if parallel.
 * @param a - The first vector
 * @param b - The second vector
 * @returns The magnitude of the cross product (a scalar value)
 */
export const cross = (a: Vector2, b: Vector2): number => a.x * b.y - a.y * b.x;

// ============================================================
// MAGNITUDE OPERATIONS
// ============================================================

/**
 * Computes the squared length (magnitude) of a vector.
 * Math: v.x² + v.y²
 * Useful for comparisons to avoid expensive sqrt calculation.
 * @param v - The vector
 * @returns The squared length
 */
export const lengthSq = (v: Vector2): number => v.x * v.x + v.y * v.y;

/**
 * Computes the length (magnitude) of a vector using the Pythagorean theorem.
 * Math: √(v.x² + v.y²)
 * @param v - The vector
 * @returns The length of the vector
 */
export const length = (v: Vector2): number => Math.sqrt(lengthSq(v));

/**
 * Computes the squared distance between two points.
 * Math: (a.x - b.x)² + (a.y - b.y)²
 * Faster than distance() for comparisons since it avoids sqrt.
 * @param a - The first point
 * @param b - The second point
 * @returns The squared distance between the points
 */
export const distanceSq = (a: Vector2, b: Vector2): number =>
  lengthSq(sub(a, b));

/**
 * Computes the Euclidean distance between two points.
 * Math: √((a.x - b.x)² + (a.y - b.y)²)
 * @param a - The first point
 * @param b - The second point
 * @returns The distance between the points
 */
export const distance = (a: Vector2, b: Vector2): number =>
  Math.sqrt(distanceSq(a, b));

/**
 * Normalizes a vector to unit length (magnitude of 1).
 * Math: v / |v| = (v.x / |v|, v.y / |v|)
 * The resulting vector points in the same direction but has length 1.
 * Returns a zero vector if the input has zero length to avoid division by zero.
 * @param v - The vector to normalize
 * @returns A unit vector in the same direction, or zero vector if input is zero
 */
export const normalize = (v: Vector2): Vector2 => {
  const len = length(v);
  return len > 0 ? scale(v, 1 / len) : zero();
};

// ============================================================
// TRANSFORMATIONS
// ============================================================

/**
 * Rotates a vector by an angle (in radians) around the origin.
 * Math: Uses rotation matrix:
 *   x' = x * cos(θ) - y * sin(θ)
 *   y' = x * sin(θ) + y * cos(θ)
 * Positive angles rotate counter-clockwise.
 * @param v - The vector to rotate
 * @param angle - The rotation angle in radians
 * @returns A new rotated vector
 */
export const rotate = (v: Vector2, angle: number): Vector2 => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
};

/**
 * Returns a perpendicular vector (rotated 90° counter-clockwise).
 * Math: (-v.y, v.x)
 * Useful for computing normals and tangents.
 * @param v - The input vector
 * @returns A vector perpendicular to the input
 */
export const perpendicular = (v: Vector2): Vector2 => ({
  x: -v.y,
  y: v.x,
});

// ============================================================
// INTERPOLATION
// ============================================================

/**
 * Linearly interpolates between two vectors.
 * Math: a + (b - a) * t = (1 - t) * a + t * b
 * When t = 0, returns a. When t = 1, returns b. Values between 0 and 1 interpolate smoothly.
 * @param a - The start vector (t = 0)
 * @param b - The end vector (t = 1)
 * @param t - The interpolation factor (typically 0 to 1)
 * @returns The interpolated vector
 */
export const lerp = (a: Vector2, b: Vector2, t: number): Vector2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

// ============================================================
// PROJECTIONS & REFLECTIONS
// ============================================================

/**
 * Projects vector a onto vector b.
 * Math: (a · b / |b|²) * b
 * Returns the component of a that lies in the direction of b.
 * @param a - The vector to project
 * @param b - The vector to project onto
 * @returns The projection of a onto b
 */
export const project = (a: Vector2, b: Vector2): Vector2 => {
  const bLengthSq = lengthSq(b);
  if (bLengthSq === 0) return zero();
  const scalar = dot(a, b) / bLengthSq;
  return scale(b, scalar);
};

/**
 * Reflects a vector across a normal.
 * Math: v - 2 * (v · n) * n
 * Used for bouncing/reflecting objects off surfaces.
 * @param v - The vector to reflect
 * @param normal - The surface normal (should be normalized)
 * @returns The reflected vector
 */
export const reflect = (v: Vector2, normal: Vector2): Vector2 => {
  const d = dot(v, normal);
  return {
    x: v.x - 2 * d * normal.x,
    y: v.y - 2 * d * normal.y,
  };
};

// ============================================================
// UTILITIES
// ============================================================

/**
 * Checks if two vectors are approximately equal within an epsilon tolerance.
 * Useful for floating-point comparisons where exact equality may fail due to rounding errors.
 * @param a - The first vector
 * @param b - The second vector
 * @param epsilon - The maximum difference allowed (default: 1e-10)
 * @returns True if the vectors are approximately equal
 */
export const equals = (
  a: Vector2,
  b: Vector2,
  epsilon = 1e-10
): boolean => Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;

/**
 * Converts a vector to a string representation.
 * @param v - The vector to convert
 * @returns A string in the format "(x, y)"
 */
export const toString = (v: Vector2): string => `(${v.x}, ${v.y})`;

// ============================================================
// CONSTANTS
// ============================================================

export const ZERO: Vector2 = { x: 0, y: 0 };
export const ONE: Vector2 = { x: 1, y: 1 };
export const UP: Vector2 = { x: 0, y: -1 };
export const DOWN: Vector2 = { x: 0, y: 1 };
export const LEFT: Vector2 = { x: -1, y: 0 };
export const RIGHT: Vector2 = { x: 1, y: 0 };
