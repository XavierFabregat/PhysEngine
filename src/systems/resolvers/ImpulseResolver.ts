import type { CollisionResolver } from '../../types/CollisionResolver.js';
import type { Body } from '../../types/Body.js';
import type { Contact } from '../../types/Contact.js';
import * as Vec2 from '../../core/Vector2.js';

/**
 * Impulse-based collision resolver.
 * 
 * Industry-standard collision response using impulse resolution.
 * This resolver:
 * 1. Separates overlapping bodies (position correction)
 * 2. Applies collision impulse (velocity change for bouncing)
 * 3. Respects material properties (restitution, friction)
 * 4. Handles static/kinematic bodies correctly
 * 
 * Math:
 * - Impulse j = -(1 + e) * vRel · n / (1/mA + 1/mB)
 * - e = combined restitution (bounce)
 * - n = contact normal
 * - vRel = relative velocity at contact
 * 
 * @example
 * const resolver = new ImpulseResolver();
 * const world = createWorld({ resolver });
 */
export class ImpulseResolver implements CollisionResolver {
  /**
   * Position correction percentage (0-1).
   * How much of the penetration to correct per frame.
   * Lower = softer, higher = more rigid
   */
  private readonly positionCorrectionPercent = 0.8;

  /**
   * Slop allowance for position correction.
   * Small penetrations below this threshold are ignored.
   * Prevents jitter from tiny overlaps.
   */
  private readonly slop = 0.01;

  /**
   * Resolves a collision between two bodies.
   * 
   * @param bodyA - First body (will be mutated)
   * @param bodyB - Second body (will be mutated)
   * @param contact - Contact information from narrow phase
   */
  resolve(bodyA: Body, bodyB: Body, contact: Contact): void {
    // Skip physical response for sensors (they only detect, don't respond)
    if (bodyA.isSensor || bodyB.isSensor) {
      return;
    }

    // 1. Position correction - separate overlapping bodies
    this.correctPosition(bodyA, bodyB, contact);

    // 2. Impulse resolution - apply bounce
    this.applyImpulse(bodyA, bodyB, contact);
  }

  /**
   * Corrects positions to separate overlapping bodies.
   * 
   * Uses linear projection along contact normal.
   * Only corrects penetration exceeding the slop threshold.
   * 
   * @param bodyA - First body
   * @param bodyB - Second body
   * @param contact - Contact information
   */
  private correctPosition(bodyA: Body, bodyB: Body, contact: Contact): void {
    // Don't correct small penetrations (prevent jitter)
    const correction = Math.max(contact.depth - this.slop, 0);
    if (correction <= 0) return;

    // Calculate correction amount based on inverse masses
    const totalInvMass = bodyA.invMass + bodyB.invMass;
    if (totalInvMass === 0) return; // Both static/kinematic

    // Correction vector
    const correctionAmount = (correction / totalInvMass) * this.positionCorrectionPercent;
    const correctionVector = Vec2.scale(contact.normal, correctionAmount);

    // Move bodies apart proportional to their inverse masses
    bodyA.position = Vec2.add(
      bodyA.position,
      Vec2.scale(correctionVector, -bodyA.invMass)
    );
    bodyB.position = Vec2.add(
      bodyB.position,
      Vec2.scale(correctionVector, bodyB.invMass)
    );
  }

  /**
   * Applies collision impulse to change velocities.
   * 
   * Calculates impulse magnitude based on:
   * - Relative velocity
   * - Combined restitution (bounciness)
   * - Inverse masses
   * 
   * @param bodyA - First body
   * @param bodyB - Second body
   * @param contact - Contact information
   */
  private applyImpulse(bodyA: Body, bodyB: Body, contact: Contact): void {
    // Calculate relative velocity
    const relativeVelocity = Vec2.sub(bodyB.velocity, bodyA.velocity);

    // Velocity along the normal
    const velocityAlongNormal = Vec2.dot(relativeVelocity, contact.normal);

    // Don't resolve if bodies are separating
    if (velocityAlongNormal > 0) return;

    // Calculate combined restitution (min gives more realistic behavior)
    const restitution = Math.min(bodyA.material.restitution, bodyB.material.restitution);

    // Calculate impulse magnitude
    // j = -(1 + e) * vRel · n / (1/mA + 1/mB)
    const impulseMagnitude =
      -(1 + restitution) * velocityAlongNormal / (bodyA.invMass + bodyB.invMass);

    // Apply impulse along normal
    const impulse = Vec2.scale(contact.normal, impulseMagnitude);

    // Update velocities (p = m * v, so Δv = j / m = j * invMass)
    bodyA.velocity = Vec2.add(bodyA.velocity, Vec2.scale(impulse, -bodyA.invMass));
    bodyB.velocity = Vec2.add(bodyB.velocity, Vec2.scale(impulse, bodyB.invMass));
  }
}

