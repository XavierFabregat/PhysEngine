import type { Body } from '../types/Body.js';
import type { Material } from '../types/Material.js';
import { BodyType } from '../types/BodyType.js';
import { createMaterial } from '../types/Material.js';
import { calculateCircleMass, calculateCircleInertia } from './utils.js';
import { generateBodyId } from './idGenerator.js';
import { computeShapeAABB } from './aabb.js';
import { assertPositiveFinite } from './validate.js';

/**
 * Configuration for creating a circle body.
 */
export interface CircleConfig {
  /** Center position in world space (default: origin) */
  position?: { x: number; y: number };

  /** Circle radius (required) */
  radius: number;

  /** Body type (default: dynamic) */
  type?: typeof BodyType.STATIC | typeof BodyType.DYNAMIC | typeof BodyType.KINEMATIC;

  /** Material properties (default: DEFAULT_MATERIAL) */
  material?: Partial<Material>;

  /** Initial linear velocity (default: zero) */
  velocity?: { x: number; y: number };

  /** Initial angular velocity in rad/s (default: 0, positive = +x toward +y) */
  angularVelocity?: number;

  /**
   * Initial rotation in radians (default: 0).
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

  /** Custom user data */
  userData?: unknown;
}

/**
 * Creates a circle-shaped rigid body.
 * 
 * Circles are the simplest and fastest shape for collision detection.
 * Use for: balls, wheels, particles, projectiles.
 * 
 * @param config - Circle configuration
 * @returns A complete Body with circle shape
 * @example
 * // Create a bouncy ball
 * const ball = createCircle({
 *   position: { x: 100, y: 200 },
 *   radius: 25,
 *   material: { restitution: 0.8 }
 * });
 * 
 * // Create a static circle (immovable)
 * const staticCircle = createCircle({
 *   position: { x: 400, y: 500 },
 *   radius: 50,
 *   type: BodyType.STATIC
 * });
 */
export const createCircle = (config: CircleConfig): Body => {
  const {
    radius,
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
    userData,
  } = config;

  assertPositiveFinite('createCircle', 'radius', radius);

  // Create material from config
  const material = createMaterial(materialConfig);

  // Calculate mass properties (static and kinematic bodies have infinite mass)
  const hasInfiniteMass = type === BodyType.STATIC || type === BodyType.KINEMATIC;
  if (!hasInfiniteMass) {
    assertPositiveFinite('createCircle', 'material.density', material.density);
  }
  const mass = hasInfiniteMass ? Infinity : calculateCircleMass(radius, material.density);
  const invMass = hasInfiniteMass ? 0 : 1 / mass;
  const inertia = hasInfiniteMass
    ? Infinity
    : calculateCircleInertia(mass, radius);
  const invInertia = hasInfiniteMass ? 0 : 1 / inertia;

  // Create circle shape
  const shape = {
    type: 'circle' as const,
    radius,
  };

  // Copy vectors so the body never aliases the caller's objects
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
    userData,
  };
};

// Re-export for tests
export { resetBodyIdCounter } from './idGenerator.js';

