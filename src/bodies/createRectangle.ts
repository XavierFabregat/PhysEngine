import type { Body } from '../types/Body.js';
import type { Material } from '../types/Material.js';
import { BodyType } from '../types/BodyType.js';
import { createMaterial } from '../types/Material.js';
import { calculateRectangleMass, calculateRectangleInertia } from './utils.js';
import { generateBodyId } from './idGenerator.js';
import { computeShapeAABB } from './aabb.js';
import { assertPositiveFinite, assertNonNegativeFinite } from './validate.js';

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

  /** Linear damping in 1/s: speed decays as e^(−d·t) (default: 0) */
  linearDamping?: number;

  /** Angular damping in 1/s: spin decays as e^(−d·t) (default: 0) */
  angularDamping?: number;

  /** Custom user data */
  userData?: unknown;
}

/**
 * Creates vertices for a rectangle in local space (centered at origin).
 * Order: top-left, top-right, bottom-right, bottom-left on a y-down screen.
 * That is positive winding (signed area > 0): counter-clockwise in y-up math
 * axes, clockwise as seen on screen.
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @returns Four vertices with positive winding
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
    { x: -halfW, y: -halfH }, // Top-left (screen)
    { x: halfW, y: -halfH },  // Top-right
    { x: halfW, y: halfH },   // Bottom-right
    { x: -halfW, y: halfH },  // Bottom-left
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
    linearDamping = 0,
    angularDamping = 0,
    userData,
  } = config;

  assertNonNegativeFinite('createRectangle', 'linearDamping', linearDamping);
  assertNonNegativeFinite('createRectangle', 'angularDamping', angularDamping);

  assertPositiveFinite('createRectangle', 'width', width);
  assertPositiveFinite('createRectangle', 'height', height);

  // Create material from config
  const material = createMaterial(materialConfig);

  // Calculate mass properties (static and kinematic bodies have infinite mass)
  const hasInfiniteMass = type === BodyType.STATIC || type === BodyType.KINEMATIC;
  if (!hasInfiniteMass) {
    assertPositiveFinite('createRectangle', 'material.density', material.density);
  }
  const mass = hasInfiniteMass
    ? Infinity
    : calculateRectangleMass(width, height, material.density);
  const invMass = hasInfiniteMass ? 0 : 1 / mass;
  const inertia = hasInfiniteMass
    ? Infinity
    : calculateRectangleInertia(mass, width, height);
  const invInertia = hasInfiniteMass ? 0 : 1 / inertia;

  // Create rectangle shape (vertices in local space)
  const shape = {
    type: 'rectangle' as const,
    width,
    height,
    vertices: createRectangleVertices(width, height),
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
    linearDamping,
    angularDamping,
    userData,
  };
};

// Re-export for tests
export { resetBodyIdCounter } from './idGenerator.js';

