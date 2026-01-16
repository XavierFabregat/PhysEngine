import type { Body } from './Body.js';
import type { Contact } from './Contact.js';

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
 * - ImpulseResolver: Industry standard, handles friction well
 * - PositionResolver: Simpler, good for Verlet integration
 * - IterativeResolver: More accurate, solves contacts multiple times
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
}

