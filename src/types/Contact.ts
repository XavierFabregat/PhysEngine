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
   * Penetration depth at each of `points` (same order), optional.
   * Positive = overlapping; negative = a speculative point still this far
   * above the surface. Solvers let such a point close its gap within the
   * step but not overshoot, instead of stopping it early. Consumers should
   * fall back to `depth` for every point when absent.
   */
  pointDepths?: readonly number[];

  /**
   * How fast the bodies were approaching along the normal when this step
   * began (world units/s, ≥ 0; the largest over the contact points, with
   * this step's gravity removed). Set by `step()` for every contact,
   * sensors included. Use it for damage, sound volume, or scoring hits.
   */
  impactSpeed?: number;

  /**
   * Total normal impulse the resolver applied this step (mass × units/s,
   * ≥ 0): the momentum it transferred along the normal. Divide by dt for the
   * contact force (a resting body's is its weight). Set by `step()`; 0 for
   * sensors and pairs that can't respond.
   */
  normalImpulse?: number;

  /** Total friction impulse applied this step, along the contact tangent (signed). */
  tangentImpulse?: number;

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

