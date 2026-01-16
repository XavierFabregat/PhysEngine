import type { Body } from '../types/Body.js';
import type { Material } from '../types/Material.js';
import { BodyType } from '../types/BodyType.js';
import { createMaterial } from '../types/Material.js';
import * as AABB from '../core/AABB.js';
import * as Transform from '../core/Transform.js';
import { calculateRectangleMass, calculateRectangleInertia } from './utils.js';
import { generateBodyId } from './idGenerator.js';

/**
 * Configuration for creating a rectangle body.
 */
export interface RectangleConfig {
  /** Center position in world space (default: origin) */
  position?: { x: number; y: number };

  /** Rectangle width (required) */
  width: number;

  /** Rectangle height (required) */
  height: number;

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

/**
 * Creates vertices for a rectangle in local space (centered at origin).
 * Vertices are in counter-clockwise order starting from bottom-left.
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @returns Four vertices in CCW order
 */
const createRectangleVertices = (
  width: number,
  height: number
): readonly [
  { x: number; y: number },
  { x: number; y: number },
  { x: number; y: number },
  { x: number; y: number }
] => {
  const halfW = width * 0.5;
  const halfH = height * 0.5;

  return [
    { x: -halfW, y: -halfH }, // Bottom-left
    { x: halfW, y: -halfH },  // Bottom-right
    { x: halfW, y: halfH },   // Top-right
    { x: -halfW, y: halfH },  // Top-left
  ];
};

/**
 * Creates a rectangle-shaped rigid body.
 * 
 * Rectangles are aligned to their local axes (not world axes).
 * Rotation rotates the entire rectangle.
 * Use for: boxes, platforms, walls, tiles.
 * 
 * @param config - Rectangle configuration
 * @returns A complete Body with rectangle shape
 * @example
 * // Create a floor platform
 * const floor = createRectangle({
 *   position: { x: 400, y: 580 },
 *   width: 800,
 *   height: 40,
 *   type: BodyType.STATIC
 * });
 * 
 * // Create a dynamic box
 * const box = createRectangle({
 *   position: { x: 100, y: 100 },
 *   width: 50,
 *   height: 50,
 *   material: { density: 500 }
 * });
 */
export const createRectangle = (config: RectangleConfig): Body => {
  const {
    width,
    height,
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
  const isStaticOrKinematic = type === BodyType.STATIC || type === BodyType.KINEMATIC;
  const mass = isStaticOrKinematic
    ? Infinity
    : calculateRectangleMass(width, height, material.density);
  const invMass = isStaticOrKinematic ? 0 : 1 / mass;
  const inertia = isStaticOrKinematic
    ? Infinity
    : calculateRectangleInertia(mass, width, height);
  const invInertia = isStaticOrKinematic ? 0 : 1 / inertia;

  // Create vertices in local space
  const vertices = createRectangleVertices(width, height);

  // Create AABB
  // If rotated, transform vertices to world space first
  let aabb: AABB.AABB;
  if (rotation === 0) {
    // Optimization: no rotation, AABB is simple
    aabb = AABB.fromCenter(position, { x: width * 0.5, y: height * 0.5 });
  } else {
    // Transform vertices to world space
    const transform = Transform.create(position, rotation);
    const worldVertices = vertices.map((v) => Transform.transformPoint(transform, v));
    aabb = AABB.fromPoints(worldVertices);
  }

  // Create rectangle shape
  const shape = {
    type: 'rectangle' as const,
    width,
    height,
    vertices,
  };

  return {
    id: generateBodyId(),
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

// Re-export for tests
export { resetBodyIdCounter } from './idGenerator.js';

