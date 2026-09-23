import type { ContactPair } from '../types/Contact.js';
import type { Vector2 } from '../core/Vector2.js';
import type { Body } from '../types/Body.js';

/** Velocity of a body at a world point: v + ω × r. */
const velocityAtPoint = (body: Body, point: Vector2): Vector2 => {
  const rx = point.x - body.position.x;
  const ry = point.y - body.position.y;
  return {
    x: body.velocity.x - body.angularVelocity * ry,
    y: body.velocity.y + body.angularVelocity * rx,
  };
};

/**
 * Sets `contact.impactSpeed`: the largest approach speed along the normal
 * over the contact points, with this step's gravity removed (velocities have
 * already been integrated when contacts are found). Also initialises the
 * impulse totals to 0 for the resolver to fill in.
 *
 * @param pair - The contact and its bodies
 * @param gravity - World gravity applied to velocities this step
 * @param dt - Time step in seconds
 * @internal
 */
export const measureImpact = ({ bodyA, bodyB, contact }: ContactPair, gravity: Vector2, dt: number): void => {
  const n = contact.normal;
  const gA = bodyA.type === 'dynamic' ? 1 : 0;
  const gB = bodyB.type === 'dynamic' ? 1 : 0;
  const gravityApproach = (gB - gA) * (gravity.x * n.x + gravity.y * n.y) * dt;

  let impactSpeed = 0;
  for (const p of contact.points?.length ? contact.points : [contact.point]) {
    const vA = velocityAtPoint(bodyA, p);
    const vB = velocityAtPoint(bodyB, p);
    const approach = (vB.x - vA.x) * n.x + (vB.y - vA.y) * n.y - gravityApproach;
    impactSpeed = Math.max(impactSpeed, -approach);
  }

  contact.impactSpeed = impactSpeed;
  contact.normalImpulse = 0;
  contact.tangentImpulse = 0;
};
