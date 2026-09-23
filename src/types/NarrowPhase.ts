import type { Body } from './Body.js';
import type { Contact } from './Contact.js';

/**
 * Narrow phase collision detection interface.
 * 
 * The narrow phase performs precise geometric collision checks between bodies.
 * It calculates exact contact information (point, normal, depth) needed for
 * realistic collision response.
 * 
 * This is the second stage of collision detection:
 * 1. Broad phase: Fast filter → potential pairs
 * 2. Narrow phase: Precise check → contact information
 * 
 * Different implementations use different algorithms:
 * - SAT (Separating Axis Theorem): Works for all convex shapes, returns contact info directly
 * - GJK+EPA: More advanced, handles any convex shape, more complex
 * 
 * The implementation must handle all shape type combinations:
 * - Circle vs Circle
 * - Circle vs Rectangle
 * - Rectangle vs Rectangle
 * - Circle vs Polygon (future)
 * - Rectangle vs Polygon (future)
 * - Polygon vs Polygon (future)
 */
export interface NarrowPhase {
  /**
   * Detects collision between two bodies using precise geometry.
   * 
   * Returns null if bodies are not colliding.
   * Returns Contact if bodies are colliding, with:
   * - Contact point in world space
   * - Contact normal (from bodyA to bodyB, normalized)
   * - Penetration depth (how far they overlap)
   * 
   * @param bodyA - First body
   * @param bodyB - Second body
   * @returns Contact information if colliding, null otherwise
   * 
   * @example
   * const contact = narrowPhase.detect(ballA, ballB);
   * if (contact) {
   *   console.log('Collision at', contact.point);
   *   console.log('Penetration:', contact.depth);
   *   console.log('Normal:', contact.normal);
   * }
   */
  detect(bodyA: Body, bodyB: Body): Contact | null;
}

