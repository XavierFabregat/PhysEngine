import type { CollisionResolver } from '../../types/CollisionResolver.js';
import type { Body } from '../../types/Body.js';
import type { Contact } from '../../types/Contact.js';
import type { Vector2 } from '../../core/Vector2.js';
import * as Vec2 from '../../core/Vector2.js';
import { resolveCombineRule, type CombineRule } from '../../types/Material.js';

/**
 * Options for the impulse resolver.
 */
export interface ImpulseResolverOptions {
  /**
   * How the two bodies' restitution values combine (default: 'min').
   * - 'min': the less bouncy body wins; floors must be bouncy for balls to bounce
   * - 'max': the bouncier body wins; a bouncy ball bounces on any surface
   * - 'average' | 'multiply' | custom `(a, b) => number`
   */
  restitutionCombine?: CombineRule;

  /**
   * How the two bodies' friction coefficients combine (default: 'average').
   * Same rules as `restitutionCombine`; e.g. 'min' makes ice slippery against
   * everything, `(a, b) => Math.sqrt(a * b)` matches Box2D.
   */
  frictionCombine?: CombineRule;

  /**
   * Solver iterations per contact (default: 8).
   * Impulses at a contact's points are solved sequentially and refined this
   * many times, which converges to the joint solution for 2-point contacts
   * (a box resting flat). Higher = more accurate, slower.
   */
  iterations?: number;
}

/** Solver state for one contact point. */
interface ContactPointState {
  rA: Vector2;
  rB: Vector2;
  /** Effective inverse mass along the normal */
  normalK: number;
  /** Target normal velocity after the collision: -e × approach speed */
  targetNormalVelocity: number;
  /** Accumulated normal impulse (≥ 0) */
  normalImpulse: number;
  /** Accumulated friction impulse along `tangent` */
  tangentImpulse: number;
}

/** Velocity of a body at a point offset `r` from its center: v + ω × r. */
const velocityAt = (body: Body, r: Vector2): Vector2 => ({
  x: body.velocity.x - body.angularVelocity * r.y,
  y: body.velocity.y + body.angularVelocity * r.x,
});

/**
 * Applies impulse `j` to body B and `-j` to body A at the given offsets,
 * updating both linear and angular velocity.
 */
const applyImpulsePair = (bodyA: Body, bodyB: Body, rA: Vector2, rB: Vector2, j: Vector2): void => {
  bodyA.velocity = Vec2.sub(bodyA.velocity, Vec2.scale(j, bodyA.invMass));
  bodyA.angularVelocity -= Vec2.cross(rA, j) * bodyA.invInertia;
  bodyB.velocity = Vec2.add(bodyB.velocity, Vec2.scale(j, bodyB.invMass));
  bodyB.angularVelocity += Vec2.cross(rB, j) * bodyB.invInertia;
};

/**
 * Effective inverse mass along direction `d` at offsets rA, rB:
 * 1/mA + 1/mB + (rA × d)²/IA + (rB × d)²/IB
 */
const effectiveInvMass = (bodyA: Body, bodyB: Body, rA: Vector2, rB: Vector2, d: Vector2): number => {
  const rAd = Vec2.cross(rA, d);
  const rBd = Vec2.cross(rB, d);
  return bodyA.invMass + bodyB.invMass + rAd * rAd * bodyA.invInertia + rBd * rBd * bodyB.invInertia;
};

/**
 * Impulse-based collision resolver with rotation and Coulomb friction.
 *
 * For each contact:
 * 1. Separates overlapping bodies (linear position correction)
 * 2. Normal impulse at every contact point, including angular terms, so
 *    off-center hits spin bodies and tilted boxes tip over
 * 3. Friction impulse along the tangent, clamped to μ × normal impulse
 *    (Coulomb's law): bodies slide when |tangential| would exceed it,
 *    otherwise they grip (balls roll, boxes stay put on gentle slopes)
 *
 * Impulses at a contact's points are solved with sequential impulses
 * (Box2D's approach): each point's accumulated impulse is refined over
 * several iterations and clamped (normal ≥ 0, |friction| ≤ μ × normal),
 * which converges to the joint solution. A box resting flat on two points
 * therefore stops exactly, with no rocking.
 *
 * Math (per point, r = contact point - body center):
 * - vRel = (vB + ωB × rB) - (vA + ωA × rA)
 * - target normal velocity = -e × (approach speed before the solve)
 * - Δjn = (target - vRel · n) / K(n), accumulated jn clamped to ≥ 0
 * - Δjt = -(vRel · t) / K(t), accumulated jt clamped to [-μ jn, μ jn]
 * - K(d) = 1/mA + 1/mB + (rA×d)²/IA + (rB×d)²/IB
 *
 * @example
 * const resolver = new ImpulseResolver();
 * const world = createWorld({ resolver });
 *
 * // Bouncy balls stay bouncy on any surface
 * const world = createWorld({
 *   resolver: new ImpulseResolver({ restitutionCombine: 'max' }),
 * });
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

  /** Combines the two bodies' restitution values. */
  private readonly combineRestitution: (a: number, b: number) => number;

  /** Combines the two bodies' friction coefficients. */
  private readonly combineFriction: (a: number, b: number) => number;

  /** Sequential-impulse iterations per contact. */
  private readonly iterations: number;

  /**
   * Creates an impulse resolver.
   * @param options - Resolver options (combine rules, iterations)
   * @throws Error if a combine option is an unknown rule name
   * @throws RangeError if iterations is not a positive integer
   */
  constructor(options: ImpulseResolverOptions = {}) {
    this.combineRestitution = resolveCombineRule(options.restitutionCombine ?? 'min');
    this.combineFriction = resolveCombineRule(options.frictionCombine ?? 'average');
    const iterations = options.iterations ?? 8;
    if (!Number.isInteger(iterations) || iterations < 1) {
      throw new RangeError(`ImpulseResolver: iterations must be a positive integer (got ${iterations})`);
    }
    this.iterations = iterations;
  }

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

    // Both bodies have infinite mass (static/kinematic): nothing can respond.
    // Without this guard impulses are x/0 and velocities become NaN.
    if (bodyA.invMass + bodyB.invMass === 0) return;

    // 1. Position correction - separate overlapping bodies
    this.correctPosition(bodyA, bodyB, contact);

    // 2. Normal (bounce) and friction impulses at every contact point
    this.solveImpulses(bodyA, bodyB, contact);
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
   * Exact solve of the two normal impulses of a 2-point manifold
   * (Box2D's block solver): finds accumulated impulses x ≥ 0 with
   * K x = target - vn, trying both-active, first-only, second-only, none.
   * Falls back to the sequential loop when K is ill-conditioned (points
   * nearly coincident).
   */
  private solveNormalBlock(
    bodyA: Body,
    bodyB: Body,
    n: Vector2,
    p1: ContactPointState,
    p2: ContactPointState
  ): void {
    const rA1n = Vec2.cross(p1.rA, n);
    const rB1n = Vec2.cross(p1.rB, n);
    const rA2n = Vec2.cross(p2.rA, n);
    const rB2n = Vec2.cross(p2.rB, n);
    const invM = bodyA.invMass + bodyB.invMass;
    const k11 = p1.normalK;
    const k22 = p2.normalK;
    const k12 = invM + bodyA.invInertia * rA1n * rA2n + bodyB.invInertia * rB1n * rB2n;
    const det = k11 * k22 - k12 * k12;
    if (k11 * k11 >= 1000 * det) return; // ill-conditioned: leave it to the sequential loop

    const normalVelocity = (state: ContactPointState) =>
      Vec2.dot(Vec2.sub(velocityAt(bodyB, state.rB), velocityAt(bodyA, state.rA)), n);
    // Required change in normal velocity at each point
    const b1 = p1.targetNormalVelocity - normalVelocity(p1);
    const b2 = p2.targetNormalVelocity - normalVelocity(p2);

    let x1 = (k22 * b1 - k12 * b2) / det;
    let x2 = (k11 * b2 - k12 * b1) / det;
    if (x1 < 0 || x2 < 0) {
      // One point separating: solve the other alone and check the first stays unpushed
      if (b1 > 0 && k12 * (b1 / k11) >= b2) {
        x1 = b1 / k11;
        x2 = 0;
      } else if (b2 > 0 && k12 * (b2 / k22) >= b1) {
        x1 = 0;
        x2 = b2 / k22;
      } else {
        x1 = 0;
        x2 = 0;
      }
    }

    p1.normalImpulse = x1;
    p2.normalImpulse = x2;
    if (x1 > 0) applyImpulsePair(bodyA, bodyB, p1.rA, p1.rB, Vec2.scale(n, x1));
    if (x2 > 0) applyImpulsePair(bodyA, bodyB, p2.rA, p2.rB, Vec2.scale(n, x2));
  }

  /**
   * Sequential impulses over the contact points: normal impulses (with
   * restitution) and Coulomb friction, refined for `iterations` passes.
   */
  private solveImpulses(bodyA: Body, bodyB: Body, contact: Contact): void {
    const points = contact.points?.length ? contact.points : [contact.point];
    const n = contact.normal;
    const restitution = this.combineRestitution(
      bodyA.material.restitution,
      bodyB.material.restitution
    );
    const mu = this.combineFriction(bodyA.material.friction, bodyB.material.friction);

    // Restitution targets use each point's approach speed before the solve
    const states: ContactPointState[] = points.map((p) => {
      const rA = Vec2.sub(p, bodyA.position);
      const rB = Vec2.sub(p, bodyB.position);
      const approach = Vec2.dot(Vec2.sub(velocityAt(bodyB, rB), velocityAt(bodyA, rA)), n);
      return {
        rA,
        rB,
        normalK: effectiveInvMass(bodyA, bodyB, rA, rB, n),
        targetNormalVelocity: approach < 0 ? -restitution * approach : 0,
        normalImpulse: 0,
        tangentImpulse: 0,
      };
    });

    // Two points: solve both normal impulses exactly as a 2x2 block first, so
    // a box landing flat gets symmetric impulses (sequential solving would
    // favour whichever point is solved first and start it rocking)
    const [first, second] = states;
    if (first && second) this.solveNormalBlock(bodyA, bodyB, n, first, second);

    for (let iteration = 0; iteration < this.iterations; iteration++) {
      // Normal impulses: drive each point's normal velocity to its target
      for (const state of states) {
        const { rA, rB } = state;
        const vn = Vec2.dot(Vec2.sub(velocityAt(bodyB, rB), velocityAt(bodyA, rA)), n);
        const delta = (state.targetNormalVelocity - vn) / state.normalK;
        const accumulated = Math.max(state.normalImpulse + delta, 0);
        const applied = accumulated - state.normalImpulse;
        state.normalImpulse = accumulated;
        if (applied !== 0) applyImpulsePair(bodyA, bodyB, rA, rB, Vec2.scale(n, applied));
      }

      if (mu <= 0) continue;

      // Friction: stop tangential sliding, within μ × normal impulse
      const tangent = Vec2.perpendicular(n);
      for (const state of states) {
        const { rA, rB } = state;
        const vt = Vec2.dot(Vec2.sub(velocityAt(bodyB, rB), velocityAt(bodyA, rA)), tangent);
        const delta = -vt / effectiveInvMass(bodyA, bodyB, rA, rB, tangent);
        const limit = mu * state.normalImpulse;
        const accumulated = Math.max(-limit, Math.min(limit, state.tangentImpulse + delta));
        const applied = accumulated - state.tangentImpulse;
        state.tangentImpulse = accumulated;
        if (applied !== 0) applyImpulsePair(bodyA, bodyB, rA, rB, Vec2.scale(tangent, applied));
      }
    }
  }
}
