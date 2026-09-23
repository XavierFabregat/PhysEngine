import type { Body } from './Body.js';
import type { Contact } from './Contact.js';

/**
 * Called when two bodies start touching, or on every step they keep touching.
 * `bodyA`/`bodyB` are in the same order as `contact` (normal points A → B).
 */
export type CollisionHandler = (bodyA: Body, bodyB: Body, contact: Contact) => void;

/** Called when two bodies stop touching (there is no contact anymore). */
export type CollisionEndHandler = (bodyA: Body, bodyB: Body) => void;

/** Removes a handler registered with onCollisionStart/Active/End. */
export type Unsubscribe = () => void;

/**
 * Per-world collision event state: registered handlers and the pairs that
 * were touching at the end of the last step (to tell start from active).
 * Managed by `step()` and the onCollision* functions; don't mutate directly.
 */
export interface CollisionEvents {
  start: Set<CollisionHandler>;
  active: Set<CollisionHandler>;
  end: Set<CollisionEndHandler>;
  /** Pairs touching after the last step, keyed by their (sorted) body IDs */
  touching: Map<string, { bodyA: Body; bodyB: Body }>;
}
