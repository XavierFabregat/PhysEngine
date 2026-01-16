import type { Integrator } from '../../types/Integrator.js';
import type { Body } from '../../types/Body.js';
import type { Vector2 } from '../../core/Vector2.js';
import * as Vec2 from '../../core/Vector2.js';

/**
 * Verlet integration (velocity-less form).
 * 
 * Verlet integration is:
 * - Naturally stable for constraints and springs
 * - Position-based (good for games)
 * - Symplectic (conserves energy well)
 * - Simple to implement
 * 
 * This is a velocity-Verlet variant that maintains explicit velocities
 * for ease of use (pure Verlet stores only positions).
 * 
 * Math:
 * - a = F/m (acceleration from force)
 * - v = v + a * dt (update velocity)
 * - p = p + v * dt (update position)
 * - Same for angular: α = τ/I, ω = ω + α * dt, θ = θ + ω * dt
 * 
 * @example
 * const integrator = new VerletIntegrator();
 * const world = createWorld({ integrator });
 */
export class VerletIntegrator implements Integrator {
  /**
   * Integrates a body's motion using Verlet integration.
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
      
      // Don't apply forces to kinematic bodies
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

