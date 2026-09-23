import type { Vector2 } from '../core/Vector2.js';
import * as math from '../core/math.js';

// ============================================================
// HELPERS
// ============================================================

/**
 * Type-safe circular array access.
 * Handles modulo indexing with proper TypeScript type narrowing.
 * @param array - The array to access
 * @param index - The index (will be wrapped with modulo)
 * @returns The element at the wrapped index
 * @throws Error if array is empty or access fails
 */
const getCircular = <T>(array: readonly T[], index: number): T => {
  if (array.length === 0) {
    throw new Error('Cannot access element from empty array');
  }
  const wrappedIndex = index % array.length;
  const item = array[wrappedIndex];
  if (item === undefined) {
    throw new Error(`Array access failed at index ${index} (wrapped: ${wrappedIndex})`);
  }
  return item;
};

// ============================================================
// CIRCLE MASS & INERTIA
// ============================================================

/**
 * Calculates the mass of a circle.
 * Math: m = π * r² * ρ (area × density)
 * @param radius - The circle radius
 * @param density - Material density in kg/m²
 * @returns The mass in kg
 */
export const calculateCircleMass = (radius: number, density: number): number => {
  const area = Math.PI * radius * radius;
  return area * density;
};

/**
 * Calculates the rotational inertia (moment of inertia) of a circle.
 * Math: I = (1/2) * m * r² (for a uniform disk)
 * @param mass - The circle mass in kg
 * @param radius - The circle radius
 * @returns The moment of inertia in kg⋅m²
 */
export const calculateCircleInertia = (mass: number, radius: number): number => {
  return 0.5 * mass * radius * radius;
};

// ============================================================
// RECTANGLE MASS & INERTIA
// ============================================================

/**
 * Calculates the mass of a rectangle.
 * Math: m = w * h * ρ (area × density)
 * @param width - The rectangle width
 * @param height - The rectangle height
 * @param density - Material density in kg/m²
 * @returns The mass in kg
 */
export const calculateRectangleMass = (
  width: number,
  height: number,
  density: number
): number => {
  const area = width * height;
  return area * density;
};

/**
 * Calculates the rotational inertia of a rectangle about its center.
 * Math: I = (1/12) * m * (w² + h²) (for a uniform rectangle)
 * @param mass - The rectangle mass in kg
 * @param width - The rectangle width
 * @param height - The rectangle height
 * @returns The moment of inertia in kg⋅m²
 */
export const calculateRectangleInertia = (
  mass: number,
  width: number,
  height: number
): number => {
  return (mass / 12) * (width * width + height * height);
};

// ============================================================
// POLYGON MASS & INERTIA
// ============================================================

/**
 * Calculates the signed area of a polygon using the shoelace formula.
 * Math: A = (1/2) * Σ(x_i * y_{i+1} - x_{i+1} * y_i)
 * Positive if vertices are counter-clockwise, negative if clockwise.
 * @param vertices - Polygon vertices
 * @returns The signed area (positive for CCW, negative for CW)
 */
export const calculatePolygonArea = (vertices: readonly Vector2[]): number => {
  if (vertices.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const v1 = getCircular(vertices, i);
    const v2 = getCircular(vertices, i + 1);
    area += v1.x * v2.y - v2.x * v1.y;
  }

  return area * 0.5;
};

/**
 * Calculates the mass of a polygon.
 * Math: m = |area| * ρ
 * Uses absolute value to handle both CW and CCW winding.
 * @param vertices - Polygon vertices
 * @param density - Material density in kg/m²
 * @returns The mass in kg
 */
export const calculatePolygonMass = (
  vertices: readonly Vector2[],
  density: number
): number => {
  const area = Math.abs(calculatePolygonArea(vertices));
  return area * density;
};

/**
 * Calculates the rotational inertia of a polygon about its centroid.
 * Math: fan-triangulate from the origin; each triangle (O, v_i, v_{i+1})
 * contributes cross_i * (x_i² + x_i·x_{i+1} + x_{i+1}² + y_i² + y_i·y_{i+1} + y_{i+1}²)
 * using the *signed* cross product, so triangles outside the polygon cancel
 * when the origin lies outside it. That gives the inertia about the origin;
 * the parallel axis theorem (I_c = I_o − m·|c|²) moves it to the centroid.
 * Works for either winding and for vertices anywhere relative to the origin.
 * @param mass - The polygon mass
 * @param vertices - Polygon vertices (convex, any winding, any offset)
 * @returns The moment of inertia about the centroid
 */
export const calculatePolygonInertia = (
  mass: number,
  vertices: readonly Vector2[]
): number => {
  if (vertices.length < 3) return 0;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < vertices.length; i++) {
    const v1 = getCircular(vertices, i);
    const v2 = getCircular(vertices, i + 1);

    const cross = v1.x * v2.y - v1.y * v2.x;
    numerator +=
      cross *
      (v1.x * v1.x + v1.x * v2.x + v2.x * v2.x + v1.y * v1.y + v1.y * v2.y + v2.y * v2.y);
    denominator += cross;
  }

  if (Math.abs(denominator) < 1e-10) return 0;

  const inertiaAboutOrigin = (mass / 6) * (numerator / denominator);
  const centroid = calculatePolygonCentroid(vertices);
  const centroidDistSq = centroid.x * centroid.x + centroid.y * centroid.y;

  return inertiaAboutOrigin - mass * centroidDistSq;
};

// ============================================================
// CENTROID CALCULATION
// ============================================================

/**
 * Calculates the centroid (center of mass) of a polygon.
 * Math: C = (1/(6A)) * Σ((v_i + v_{i+1}) * (x_i * y_{i+1} - x_{i+1} * y_i))
 * @param vertices - Polygon vertices
 * @returns The centroid position
 */
export const calculatePolygonCentroid = (
  vertices: readonly Vector2[]
): Vector2 => {
  if (vertices.length < 3) return { x: 0, y: 0 };

  const area = calculatePolygonArea(vertices);
  if (Math.abs(area) < 1e-10) return { x: 0, y: 0 };

  let cx = 0;
  let cy = 0;

  for (let i = 0; i < vertices.length; i++) {
    const v1 = getCircular(vertices, i);
    const v2 = getCircular(vertices, i + 1);
    const cross = v1.x * v2.y - v2.x * v1.y;

    cx += (v1.x + v2.x) * cross;
    cy += (v1.y + v2.y) * cross;
  }

  const factor = 1 / (6 * area);
  return {
    x: cx * factor,
    y: cy * factor,
  };
};

// ============================================================
// POLYGON VALIDATION
// ============================================================

/**
 * Checks if polygon vertices are ordered counter-clockwise.
 * Math: Area > 0 means CCW, < 0 means CW.
 * "Counter-clockwise" is in y-up math axes; on a y-down screen the same
 * vertices appear clockwise. Rectangles created by this library have
 * positive area.
 * @param vertices - Polygon vertices
 * @returns True if vertices are counter-clockwise
 */
export const isCounterClockwise = (vertices: readonly Vector2[]): boolean => {
  return calculatePolygonArea(vertices) > 0;
};

/**
 * Checks if a polygon is convex (and simple, i.e. not self-intersecting).
 * Math: all cross products of consecutive edges must have the same sign, AND
 * the edges must turn through exactly one full revolution (±2π) in total.
 * The second condition rejects self-intersecting "star" polygons such as a
 * pentagram, whose edges all turn the same way but wind around twice (4π).
 * Degenerate polygons (zero area, e.g. all vertices collinear) are rejected.
 * @param vertices - Polygon vertices (either winding)
 * @returns True if the polygon is convex and simple
 */
export const isConvex = (vertices: readonly Vector2[]): boolean => {
  if (vertices.length < 3) return false;
  if (Math.abs(calculatePolygonArea(vertices)) < 1e-10) return false;

  let hasPositive = false;
  let hasNegative = false;
  let totalTurn = 0;

  for (let i = 0; i < vertices.length; i++) {
    const v1 = getCircular(vertices, i);
    const v2 = getCircular(vertices, i + 1);
    const v3 = getCircular(vertices, i + 2);

    // Edge vectors
    const e1x = v2.x - v1.x;
    const e1y = v2.y - v1.y;
    const e2x = v3.x - v2.x;
    const e2y = v3.y - v2.y;

    // Cross product (z-component)
    const cross = e1x * e2y - e1y * e2x;

    if (cross > 1e-10) hasPositive = true;
    if (cross < -1e-10) hasNegative = true;

    // If we have both positive and negative, it's concave
    if (hasPositive && hasNegative) return false;

    // Signed exterior angle at v2
    totalTurn += Math.atan2(cross, e1x * e2x + e1y * e2y);
  }

  // A simple convex polygon winds exactly once
  return Math.abs(Math.abs(totalTurn) - 2 * Math.PI) < 1e-6;
};
