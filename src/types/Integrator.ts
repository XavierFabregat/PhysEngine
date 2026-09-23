import type { Body } from './Body.js';
import type { Vector2 } from '../core/Vector2.js';

/**
 * Integrator interface for numerical integration of motion equations.
 * 
 * Integrators update body positions and velocities based on forces and time.
 * Different integrators offer trade-offs between accuracy, stability, and performance.
 */
export interface Integrator {
  /**
   * Integrates a single body's motion over a time step.
   * 
   * Updates the body's position and rotation based on velocity,
   * and velocity based on forces and acceleration.
   * 
   * @param body - The body to integrate (will be mutated)
   * @param dt - Time step in seconds
   * @param gravity - Global gravity acceleration vector
   * 
   * @example
   * const integrator = new SemiImplicitEulerIntegrator();
   * integrator.integrate(body, 1/60, world.gravity);
   */
  integrate(body: Body, dt: number, gravity: Vector2): void;

  /**
   * Velocity half of the step: applies gravity and accumulated forces to
   * velocity and angular velocity, then clears the force accumulators.
   *
   * Optional. When an integrator implements both `integrateVelocity` and
   * `integratePosition`, `step()` solves contacts between the two halves
   * (Box2D's order), so resting bodies don't creep and stacks don't sink.
   * Integrators with only `integrate()` keep the legacy order.
   */
  integrateVelocity?(body: Body, dt: number, gravity: Vector2): void;

  /**
   * Position half of the step: advances position and rotation by the
   * (contact-corrected) velocities. Optional; see `integrateVelocity`.
   */
  integratePosition?(body: Body, dt: number): void;
}

