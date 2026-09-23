import type { Body } from './Body.js';
import type { Contact, ContactPair } from './Contact.js';
import type { Vector2 } from '../core/Vector2.js';

/**
 * Collision resolver interface for collision response.
 * 
 * The resolver handles the physics of what happens AFTER a collision is detected.
 * It modifies body velocities and positions to simulate realistic bouncing,
 * separation, and friction.
 * 
 * This is the third stage of collision handling:
 * 1. Broad phase: Filter potential pairs
 * 2. Narrow phase: Detect precise collisions
 * 3. Resolver: Apply physics response
 * 
 * Different implementations offer different trade-offs:
 * - ImpulseResolver: Sequential impulses with rotation and friction (default)
 * - PositionResolver: Simpler, position-based (PBD-style)
 */
export interface CollisionResolver {
  /**
   * Resolves a collision between two bodies.
   * 
   * Modifies both bodies to:
   * - Separate them (position correction)
   * - Apply bounce (impulse based on restitution)
   * - Apply friction (tangent impulse)
   * - Update angular velocities (rotation from off-center impacts)
   * 
   * Static and kinematic bodies are handled specially:
   * - Static: infinite mass, never moves
   * - Kinematic: infinite mass, but can push dynamic bodies
   * - Dynamic: normal physics
   * 
   * @param bodyA - First body (will be mutated)
   * @param bodyB - Second body (will be mutated)
   * @param contact - Contact information from narrow phase
   * 
   * @example
   * // After narrow phase detects collision:
   * if (contact) {
   *   resolver.resolve(bodyA, bodyB, contact);
   *   // Bodies now separated and bounced
   * }
   */
  resolve(bodyA: Body, bodyB: Body, contact: Contact): void;

  /**
   * Velocity phase for all of a step's contacts at once (optional).
   *
   * Called by `step()` after velocities are integrated and before positions
   * are, so impulses stop bodies before they move into each other. Solving
   * every contact together (iteratively) is what keeps stacks stable.
   * Resolvers without it are called through `resolve()` per contact.
   *
   * @param contacts - Every contact found this step
   * @param dt - Time step in seconds (for speculative contacts)
   * @param gravity - World gravity; lets restitution use the approach speed
   *   from before this step's gravity was added (otherwise every bounce
   *   gains g·dt of speed)
   */
  solveVelocities?(contacts: readonly ContactPair[], dt: number, gravity?: Vector2): void;

  /**
   * Position phase (optional): pushes still-overlapping bodies apart after
   * positions are integrated. Called with the same contacts as
   * `solveVelocities`.
   *
   * @param contacts - Every contact found this step
   */
  correctPositions?(contacts: readonly ContactPair[]): void;
}
