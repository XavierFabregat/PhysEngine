import type { Body } from '../types/Body.js';
import type { Material } from '../types/Material.js';
import type { Vector2 } from '../core/Vector2.js';
import { BodyType } from '../types/BodyType.js';
import { createMaterial } from '../types/Material.js';
import {
  calculatePolygonArea,
  calculatePolygonCentroid,
  calculatePolygonMass,
  calculatePolygonInertia,
  isConvex,
} from './utils.js';
import { generateBodyId } from './idGenerator.js';
import { computeShapeAABB } from './aabb.js';
import { assertPositiveFinite, assertNonNegativeFinite } from './validate.js';

/**
 * Configuration for creating a convex polygon body.
 */
export interface PolygonConfig {
  /**
   * Polygon vertices relative to `position` (required).
   * Must describe a convex, non-self-intersecting polygon with at least 3
   * vertices. Either winding is accepted; it is normalized to positive winding.
   */
  vertices: readonly Vector2[];

  /**
   * World position of the vertices' origin (default: origin).
   * The body is re-centered on the polygon's centroid, so `body.position`
   * is `position + centroid`: the shape appears exactly where the vertices
   * place it, and rotates about its center of mass.
   */
  position?: { x: number; y: number };

  /** Body type (default: dynamic) */
  type?: typeof BodyType.STATIC | typeof BodyType.DYNAMIC | typeof BodyType.KINEMATIC;

  /** Material properties (default: DEFAULT_MATERIAL) */
  material?: Partial<Material>;

  /** Initial linear velocity (default: zero) */
  velocity?: { x: number; y: number };

  /** Initial angular velocity in rad/s (default: 0, positive = +x toward +y) */
  angularVelocity?: number;

  /**
   * Initial rotation in radians about the centroid (default: 0).
   * Positive rotates +x toward +y (clockwise on a y-down screen).
   */
  rotation?: number;

  /** Collision layer bitmask (default: 1) */
  layer?: number;

  /** Collision mask - which layers to collide with (default: 0xffffffff) */
  collidesWith?: number;

  /** Is this a sensor (detect but don't respond)? (default: false) */
  isSensor?: boolean;

  /** Use continuous collision detection? (default: false) */
  isBullet?: boolean;

  /** Linear damping in 1/s: speed decays as e^(−d·t) (default: 0) */
  linearDamping?: number;

  /** Angular damping in 1/s: spin decays as e^(−d·t) (default: 0) */
  angularDamping?: number;

  /** Custom user data */
  userData?: unknown;
}

/**
 * Creates a convex polygon rigid body.
 *
 * Use for: triangles, ramps, wedges, hexagons, any convex outline.
 * Concave shapes are rejected (decompose them into convex pieces).
 *
 * @param config - Polygon configuration
 * @returns A complete Body with polygon shape, centered on its centroid
 * @throws RangeError for fewer than 3 vertices, non-finite coordinates,
 *   zero area, a concave or self-intersecting outline, or density <= 0
 *   on a dynamic body
 * @example
 * // A triangle whose vertices are given in world units around (200, 100)
 * const wedge = createPolygon({
 *   position: { x: 200, y: 100 },
 *   vertices: [{ x: -30, y: 20 }, { x: 30, y: 20 }, { x: 0, y: -25 }],
 * });
 */
export const createPolygon = (config: PolygonConfig): Body => {
  const {
    vertices: inputVertices,
    position = { x: 0, y: 0 },
    type = BodyType.DYNAMIC,
    material: materialConfig = {},
    velocity = { x: 0, y: 0 },
    angularVelocity = 0,
    rotation = 0,
    layer = 1,
    collidesWith = 0xffffffff,
    isSensor = false,
    isBullet = false,
    linearDamping = 0,
    angularDamping = 0,
    userData,
  } = config;

  assertNonNegativeFinite('createPolygon', 'linearDamping', linearDamping);
  assertNonNegativeFinite('createPolygon', 'angularDamping', angularDamping);

  if (!Array.isArray(inputVertices) || inputVertices.length < 3) {
    throw new RangeError('createPolygon: vertices must contain at least 3 points');
  }
  if (inputVertices.some((v) => !Number.isFinite(v.x) || !Number.isFinite(v.y))) {
    throw new RangeError('createPolygon: vertex coordinates must be finite numbers');
  }

  const signedArea = calculatePolygonArea(inputVertices);
  if (Math.abs(signedArea) < 1e-10) {
    throw new RangeError('createPolygon: polygon has zero area');
  }
  if (!isConvex(inputVertices)) {
    throw new RangeError('createPolygon: polygon must be convex and not self-intersecting');
  }

  // Normalize to positive winding (what the collision code expects)
  const wound = signedArea > 0 ? [...inputVertices] : [...inputVertices].reverse();

  // Re-center on the centroid so body.position is the center of mass
  const centroid = calculatePolygonCentroid(wound);
  const vertices = wound.map((v) => ({ x: v.x - centroid.x, y: v.y - centroid.y }));

  // Create material from config
  const material = createMaterial(materialConfig);

  // Calculate mass properties (static and kinematic bodies have infinite mass)
  const hasInfiniteMass = type === BodyType.STATIC || type === BodyType.KINEMATIC;
  if (!hasInfiniteMass) {
    assertPositiveFinite('createPolygon', 'material.density', material.density);
  }
  const mass = hasInfiniteMass ? Infinity : calculatePolygonMass(vertices, material.density);
  const invMass = hasInfiniteMass ? 0 : 1 / mass;
  const inertia = hasInfiniteMass ? Infinity : calculatePolygonInertia(mass, vertices);
  const invInertia = hasInfiniteMass ? 0 : 1 / inertia;

  const shape = {
    type: 'polygon' as const,
    vertices,
  };

  // Copy vectors so the body never aliases the caller's objects
  const bodyPosition = { x: position.x + centroid.x, y: position.y + centroid.y };

  return {
    id: generateBodyId(),
    type,
    position: bodyPosition,
    rotation,
    velocity: { x: velocity.x, y: velocity.y },
    angularVelocity,
    force: { x: 0, y: 0 },
    torque: 0,
    mass,
    invMass,
    inertia,
    invInertia,
    material,
    shape,
    aabb: computeShapeAABB(shape, bodyPosition, rotation),
    layer,
    collidesWith,
    isSensor,
    isAwake: true,
    isBullet,
    linearDamping,
    angularDamping,
    userData,
  };
};
