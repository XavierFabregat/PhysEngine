import type { Integrator } from '../../types/Integrator.js';
import type { Body } from '../../types/Body.js';
import type { Vector2 } from '../../core/Vector2.js';
import * as Vec2 from '../../core/Vector2.js';

/**
 * Semi-implicit (symplectic) Euler integration.
 *
 * Velocity is updated first, then position is advanced with the *new*
 * velocity. This reordering versus explicit Euler makes the scheme symplectic:
 * - Stable for springs and oscillators (energy stays bounded instead of growing)
 * - Cheap: one force evaluation per step
 * - Keeps explicit velocities, so impulses can be applied directly
 *
 * Accuracy is first order: position error scales with dt. For free fall under
 * gravity g, the position after time t is `½gt² + ½g·t·dt`
 * (5.083 instead of 5.0 for g=10, t=1, dt=1/60).
 *
 * Math:
 * - a = F/m (acceleration from force)
 * - v = v + a * dt (update velocity)
 * - p = p + v * dt (update position with the new velocity)
 * - Same for angular: α = τ/I, ω = ω + α * dt, θ = θ + ω * dt
 *
 * @example
 * const integrator = new SemiImplicitEulerIntegrator();
 * const world = createWorld({ integrator });
 */
export class SemiImplicitEulerIntegrator implements Integrator {
  /**
   * Integrates a body's motion using semi-implicit Euler integration.
   *
   * @param body - The body to integrate (mutated in place)
   * @param dt - Time step in seconds
   * @param gravity - Global gravity vector
   */
  integrate(body: Body, dt: number, gravity: Vector2): void {
    // Skip static bodies (infinite mass, don't move)
    if (body.type === 'static') {
      return;
    }

    // Kinematic bodies move by velocity only (no forces)
    if (body.type === 'kinematic') {
      // Update position from velocity
      body.position = Vec2.add(body.position, Vec2.scale(body.velocity, dt));

      // Update rotation from angular velocity
      body.rotation += body.angularVelocity * dt;

      // Forces are ignored, but still cleared so they don't accumulate
      body.force = { x: 0, y: 0 };
      body.torque = 0;
      return;
    }

    // Dynamic bodies - full physics simulation

    // Apply gravity force (F = m * g)
    const gravityForce = Vec2.scale(gravity, body.mass);
    body.force = Vec2.add(body.force, gravityForce);

    // Linear integration
    // a = F / m (using invMass for efficiency)
    const acceleration = Vec2.scale(body.force, body.invMass);

    // v = v + a * dt
    body.velocity = Vec2.add(body.velocity, Vec2.scale(acceleration, dt));

    // p = p + v * dt
    body.position = Vec2.add(body.position, Vec2.scale(body.velocity, dt));

    // Angular integration
    // α = τ / I (using invInertia for efficiency)
    const angularAcceleration = body.torque * body.invInertia;

    // ω = ω + α * dt
    body.angularVelocity += angularAcceleration * dt;

    // θ = θ + ω * dt
    body.rotation += body.angularVelocity * dt;

    // Reset forces for next frame (forces are per-frame accumulators)
    body.force = { x: 0, y: 0 };
    body.torque = 0;
  }
}

/**
 * @deprecated This integrator was always semi-implicit Euler, not Verlet.
 * Use {@link SemiImplicitEulerIntegrator}. Kept as an alias so existing
 * imports keep working; it will be removed in a future major version.
 */
export const VerletIntegrator = SemiImplicitEulerIntegrator;
/** @deprecated Use {@link SemiImplicitEulerIntegrator}. */
export type VerletIntegrator = SemiImplicitEulerIntegrator;
