import type { Body } from '../types/Body.js';
import type { Material } from '../types/Material.js';
import { BodyType } from '../types/BodyType.js';
import { createMaterial } from '../types/Material.js';
import * as AABB from '../core/AABB.js';
import { calculateCircleMass, calculateCircleInertia } from './utils.js';

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

  /** Initial angular velocity in rad/s (default: 0) */
  angularVelocity?: number;

  /** Initial rotation in radians (default: 0) */
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

let nextBodyId = 0;

/**
 * Generates a unique body ID.
 * @returns A unique string identifier
 */
const generateId = (): string => {
  return `body_${nextBodyId++}`;
};

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

  // Create material from config
  const material = createMaterial(materialConfig);

  // Calculate mass properties
  const isStatic = type === BodyType.STATIC || type === BodyType.KINEMATIC;
  const mass = isStatic ? Infinity : calculateCircleMass(radius, material.density);
  const invMass = isStatic ? 0 : 1 / mass;
  const inertia = isStatic
    ? Infinity
    : calculateCircleInertia(mass, radius);
  const invInertia = isStatic ? 0 : 1 / inertia;

  // Create AABB
  const aabb = AABB.fromCenter(position, { x: radius, y: radius });

  // Create circle shape
  const shape = {
    type: 'circle' as const,
    radius,
  };

  return {
    id: generateId(),
    type,
    position,
    rotation,
    velocity,
    angularVelocity,
    force: { x: 0, y: 0 },
    torque: 0,
    mass,
    invMass,
    inertia,
    invInertia,
    material,
    shape,
    aabb,
    layer,
    collidesWith,
    isSensor,
    isAwake: true,
    isBullet,
    userData,
  };
};

/**
 * Resets the body ID counter.
 * Useful for deterministic testing.
 * @internal
 */
export const resetBodyIdCounter = (): void => {
  nextBodyId = 0;
};

