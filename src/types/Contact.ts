import type { Vector2 } from '../core/Vector2.js';

/**
 * Contact information for a collision between two bodies.
 * 
 * A contact represents a single point where two bodies touch or overlap.
 * This information is used to:
 * - Separate overlapping bodies (position correction)
 * - Calculate impulse for bouncing (collision response)
 * - Apply friction
 */
export interface Contact {
  /**
   * Point of contact in world space.
   * 
   * For circle-circle: point on circle A's surface along the collision normal
   * For circle-rect: point on the rectangle boundary closest to the circle
   *   center (on the nearest face when the center is inside the rectangle)
   * For polygon-polygon (incl. rectangles): midpoint of `points`
   */
  point: Vector2;

  /**
   * All contact points of the manifold in world space (1 or 2).
   *
   * Two points when edges touch (e.g. a box resting flat on a floor), which
   * is what rotational response and friction need to keep boxes stable.
   * Circle contacts have a single point. Optional so custom narrow phases
   * can omit it; consumers should fall back to `[point]`.
   */
  points?: readonly Vector2[];

  /**
   * Contact normal vector (unit length).
   * 
   * Points FROM bodyA TO bodyB.
   * This is the direction to push bodies apart and apply impulse.
   * 
   * Always normalized (length = 1).
   */
  normal: Vector2;

  /**
   * Penetration depth (always positive for actual collisions).
   * 
   * How far the bodies overlap.
   * - depth = 0: just touching
   * - depth > 0: overlapping
   * - Used for position correction and impulse magnitude
   */
  depth: number;
}

/**
 * A pair of colliding bodies with their contact information.
 */
export interface ContactPair {
  /** First body in the collision */
  bodyA: Body;

  /** Second body in the collision */
  bodyB: Body;

  /** Contact information */
  contact: Contact;
}

// Avoid circular dependency - import Body type only for type checking
import type { Body } from './Body.js';

