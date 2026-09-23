import type { Body } from '../types/Body.js';
import type { Material } from '../types/Material.js';
import type { Vector2 } from '../core/Vector2.js';
import { BodyType } from '../types/BodyType.js';
import { createMaterial } from '../types/Material.js';
import { generateBodyId } from './idGenerator.js';
import { computeShapeAABB } from './aabb.js';

/**
 * Configuration for creating a chain (polyline) body.
 */
export interface ChainConfig {
  /** Polyline points, relative to `position` (at least 2; 3 for a loop) */
  points: readonly Vector2[];

  /** World position of the points' origin (default: origin) */
  position?: { x: number; y: number };

  /** Connect the last point back to the first (default: false) */
  loop?: boolean;

  /**
   * Body type (default: static). Chains have no area or mass, so they can't
   * be dynamic; a kinematic chain can move or rotate (moving terrain).
   */
  type?: typeof BodyType.STATIC | typeof BodyType.KINEMATIC;

  /** Material properties (default: DEFAULT_MATERIAL) */
  material?: Partial<Material>;

  /** Velocity for kinematic chains (default: zero) */
  velocity?: { x: number; y: number };

  /** Angular velocity for kinematic chains, about `position` (default: 0) */
  angularVelocity?: number;

  /** Rotation in radians about `position` (default: 0) */
  rotation?: number;

  /** Collision layer bitmask (default: 1) */
  layer?: number;

  /** Collision mask - which layers to collide with (default: 0xffffffff) */
  collidesWith?: number;

  /** Is this a sensor (detect but don't respond)? (default: false) */
  isSensor?: boolean;

  /** Custom user data */
  userData?: unknown;
}

/**
 * Creates a chain body: a polyline of connected segments for terrain,
 * drawn lines or level outlines. One chain replaces a row of overlapping
 * boxes, and balls roll across its joints smoothly instead of bumping.
 *
 * @param config - Chain configuration
 * @returns A static (or kinematic) Body with a chain shape
 * @throws RangeError for fewer than 2 points (3 for a loop), non-finite
 *   coordinates, repeated consecutive points, or a dynamic type
 * @example
 * const ground = createChain({
 *   points: [{ x: 0, y: 500 }, { x: 300, y: 540 }, { x: 600, y: 520 }, { x: 960, y: 560 }],
 * });
 */
export const createChain = (config: ChainConfig): Body => {
  const {
    points,
    position = { x: 0, y: 0 },
    loop = false,
    type = BodyType.STATIC,
    material: materialConfig = {},
    velocity = { x: 0, y: 0 },
    angularVelocity = 0,
    rotation = 0,
    layer = 1,
    collidesWith = 0xffffffff,
    isSensor = false,
    userData,
  } = config;

  if ((type as string) === BodyType.DYNAMIC) {
    throw new RangeError('createChain: chains have no mass; use a static or kinematic type');
  }
  if (!Array.isArray(points) || points.length < (loop ? 3 : 2)) {
    throw new RangeError(`createChain: need at least ${loop ? 3 : 2} points${loop ? ' for a loop' : ''}`);
  }
  if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    throw new RangeError('createChain: point coordinates must be finite numbers');
  }
  const segmentCount = loop ? points.length : points.length - 1;
  for (let i = 0; i < segmentCount; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    if (a.x === b.x && a.y === b.y) throw new RangeError(`createChain: points ${i} and ${(i + 1) % points.length} are the same`);
  }

  const shape = { type: 'chain' as const, vertices: points.map((p) => ({ x: p.x, y: p.y })), loop };
  const bodyPosition = { x: position.x, y: position.y };

  return {
    id: generateBodyId(),
    type,
    position: bodyPosition,
    rotation,
    velocity: { x: velocity.x, y: velocity.y },
    angularVelocity,
    force: { x: 0, y: 0 },
    torque: 0,
    mass: Infinity,
    invMass: 0,
    inertia: Infinity,
    invInertia: 0,
    material: createMaterial(materialConfig),
    shape,
    aabb: computeShapeAABB(shape, bodyPosition, rotation),
    layer,
    collidesWith,
    isSensor,
    isAwake: true,
    isBullet: false,
    linearDamping: 0,
    angularDamping: 0,
    userData,
  };
};
