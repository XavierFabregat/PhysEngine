import type { Body } from '../types/Body.js';
import type { Vector2 } from '../core/Vector2.js';

const assertFiniteVector = (fn: string, name: string, v: Vector2): void => {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) {
    throw new RangeError(`${fn}: ${name} must have finite x and y (got ${v.x}, ${v.y})`);
  }
};

/** Torque of a force/impulse applied at a world point: r × F, r from the center of mass. */
const leverTorque = (body: Body, vector: Vector2, point: Vector2): number =>
  (point.x - body.position.x) * vector.y - (point.y - body.position.y) * vector.x;

/**
 * Adds a force (mass × units/s²) for the next step. Forces accumulate and
 * are cleared after each step, so call it every step for a sustained push
 * (thrust, wind, a spring). Applied at a world point off the center of mass,
 * it also adds torque (r × F), so the body starts to spin.
 *
 * Only dynamic bodies respond; static and kinematic bodies ignore forces.
 *
 * @param body - The body to push
 * @param force - Force in world space
 * @param point - Where it acts, in world space (default: the center of mass)
 * @throws RangeError if the force or point is not finite
 * @example
 * // Thrust along the rover's facing, every step
 * applyForce(rover, { x: Math.cos(rover.rotation) * 900 * rover.mass, y: Math.sin(rover.rotation) * 900 * rover.mass });
 */
export const applyForce = (body: Body, force: Vector2, point?: Vector2): void => {
  assertFiniteVector('applyForce', 'force', force);
  if (point) assertFiniteVector('applyForce', 'point', point);
  if (body.type !== 'dynamic') return;

  body.force = { x: body.force.x + force.x, y: body.force.y + force.y };
  if (point) body.torque += leverTorque(body, force, point);
};

/**
 * Changes a body's velocity instantly by an impulse (mass × units/s), as if
 * hit: Δv = J / m. Applied at a world point off the center of mass it also
 * changes the spin: Δω = (r × J) / I.
 *
 * Only dynamic bodies respond; static and kinematic bodies ignore impulses.
 *
 * @param body - The body to kick
 * @param impulse - Impulse in world space
 * @param point - Where it acts, in world space (default: the center of mass)
 * @throws RangeError if the impulse or point is not finite
 * @example
 * // Kick a ball up and to the right, off-centre so it spins
 * applyImpulse(ball, { x: 200 * ball.mass, y: -300 * ball.mass }, { x: ball.position.x, y: ball.position.y + 10 });
 */
export const applyImpulse = (body: Body, impulse: Vector2, point?: Vector2): void => {
  assertFiniteVector('applyImpulse', 'impulse', impulse);
  if (point) assertFiniteVector('applyImpulse', 'point', point);
  if (body.type !== 'dynamic') return;

  body.velocity = {
    x: body.velocity.x + impulse.x * body.invMass,
    y: body.velocity.y + impulse.y * body.invMass,
  };
  if (point) body.angularVelocity += leverTorque(body, impulse, point) * body.invInertia;
};

/**
 * Adds a torque (mass × units²/s²) for the next step; like forces, torques
 * accumulate and are cleared after each step. Positive torque turns +x
 * toward +y (clockwise on a y-down screen).
 *
 * Only dynamic bodies respond.
 *
 * @param body - The body to twist
 * @param torque - Torque (signed)
 * @throws RangeError if the torque is not finite
 */
export const applyTorque = (body: Body, torque: number): void => {
  if (!Number.isFinite(torque)) throw new RangeError(`applyTorque: torque must be finite (got ${torque})`);
  if (body.type !== 'dynamic') return;
  body.torque += torque;
};
