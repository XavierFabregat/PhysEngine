import type { Vector2 } from '../core/Vector2.js';
import type { AABB } from '../core/AABB.js';
import type { Material } from './Material.js';
import type { Shape } from './Shape.js';
import type { BodyType } from './BodyType.js';

/**
 * A rigid body in the physics world.
 * 
 * Bodies are plain mutable data objects: the world's `step()` updates
 * position, velocity, rotation, force and AABB in place every frame (for
 * performance). The vector values stored on a body (position, velocity, ...)
 * are replaced rather than mutated by the engine, so a vector you read from
 * a body is a stable snapshot.
 *
 * Coordinates are y-down screen space in arbitrary world units (pixels by
 * default): +x is right, +y is down.
 */
export interface Body {
  // ============================================================
  // IDENTITY
  // ============================================================

  /** Unique identifier for this body */
  id: string;

  /** User data for game logic (sprite reference, player info, etc.) */
  userData?: unknown;

  // ============================================================
  // TYPE
  // ============================================================

  /** Body type determines how it participates in physics simulation */
  type: BodyType;

  // ============================================================
  // TRANSFORM (Position & Rotation)
  // ============================================================

  /** Position of center of mass in world space */
  position: Vector2;

  /**
   * Rotation angle in radians. Positive rotates +x toward +y, which is
   * clockwise on a y-down screen (counter-clockwise in y-up math axes).
   */
  rotation: number;

  // ============================================================
  // LINEAR MOTION
  // ============================================================

  /** Linear velocity in world units per second */
  velocity: Vector2;

  /** Accumulated forces for this frame (reset each step) */
  force: Vector2;

  // ============================================================
  // ANGULAR MOTION
  // ============================================================

  /** Angular velocity in rad/s (positive = +x toward +y, clockwise on screen) */
  angularVelocity: number;

  /** Accumulated torque for this frame (reset each step) */
  torque: number;

  // ============================================================
  // MASS PROPERTIES
  // ============================================================

  /**
   * Mass (area × density, in world mass units).
   * - Dynamic bodies: calculated from shape area × density
   * - Static/kinematic: Infinity
   */
  mass: number;

  /**
   * Inverse mass (1/mass).
   * Cached for performance. Zero for static/kinematic bodies.
   */
  invMass: number;

  /**
   * Rotational inertia (moment of inertia) about the center of mass.
   * Resistance to angular acceleration.
   * - Dynamic bodies: calculated from shape
   * - Static/kinematic: Infinity
   */
  inertia: number;

  /**
   * Inverse inertia (1/inertia).
   * Cached for performance. Zero for static/kinematic bodies.
   */
  invInertia: number;

  // ============================================================
  // MATERIAL
  // ============================================================

  /** Material properties (friction, restitution, density) */
  material: Material;

  // ============================================================
  // SHAPE & COLLISION
  // ============================================================

  /** Shape geometry (circle, rectangle, or polygon) */
  shape: Shape;

  /**
   * Axis-aligned bounding box in world space.
   * Updated each frame for broad-phase collision detection.
   */
  aabb: AABB;

  // ============================================================
  // COLLISION FILTERING
  // ============================================================

  /**
   * Collision layer (bitmask).
   * Defines which layer this body belongs to.
   * Example: layer = 1 << 0 (binary: 0001)
   */
  layer: number;

  /**
   * Collision mask (bitmask).
   * Defines which layers this body can collide with.
   * Example: collidesWith = (1 << 0) | (1 << 2) (binary: 0101)
   */
  collidesWith: number;

  /**
   * If true, this body detects collisions but doesn't respond to them.
   * Sensors obey the same layer/mask filtering as other bodies.
   * Useful for: trigger zones, pickups, area detectors.
   */
  isSensor: boolean;

  // ============================================================
  // STATE FLAGS
  // ============================================================

  /**
   * If false, body is sleeping (not simulated until woken).
   * Optimization for bodies that have come to rest.
   */
  isAwake: boolean;

  /**
   * If true, use continuous collision detection (CCD) for this body.
   * Prevents tunneling for fast/small objects.
   * More expensive, use only when needed.
   */
  isBullet: boolean;
}

/**
 * Helper to check if body is static.
 */
export const isStatic = (body: Body): boolean => body.type === 'static';

/**
 * Helper to check if body is dynamic.
 */
export const isDynamic = (body: Body): boolean => body.type === 'dynamic';

/**
 * Helper to check if body is kinematic.
 */
export const isKinematic = (body: Body): boolean => body.type === 'kinematic';

/**
 * Helper to check if two bodies should collide based on filtering.
 * Returns true if body A's layer matches body B's collidesWith mask AND vice versa.
 * Applies to sensors too: `isSensor` only changes the response, not the filter.
 */
export const shouldCollide = (bodyA: Body, bodyB: Body): boolean => {
  // Check layer filtering (bidirectional)
  return (
    (bodyA.layer & bodyB.collidesWith) !== 0 &&
    (bodyB.layer & bodyA.collidesWith) !== 0
  );
};

