import type { CollisionResolver } from '../../types/CollisionResolver.js';
import type { Body } from '../../types/Body.js';
import type { Contact, ContactPair } from '../../types/Contact.js';
import type { Vector2 } from '../../core/Vector2.js';
import * as Vec2 from '../../core/Vector2.js';
import * as Transform from '../../core/Transform.js';
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
   * Solver iterations per step (default: 10).
   * All contacts of a step are solved together and refined this many times
   * (Gauss-Seidel), so forces propagate through stacks and piles.
   * Higher = stiffer stacks, slower.
   */
  iterations?: number;

  /**
   * Approach speed (world units/s) below which contacts don't bounce
   * (default: 10). Without it a resting body, which gains g·dt of approach
   * speed every step (6.7 units/s at the default gravity and 60 Hz), keeps
   * micro-bouncing on a bouncy surface. Keep it above g·dt for your world.
   */
  restitutionThreshold?: number;

  /**
   * Start each step from the previous step's impulses (default: true).
   * Persistent contacts (resting, stacked) then converge across frames
   * instead of from zero every step, which is what lets tall stacks stand
   * with a handful of iterations. Makes the resolver stateful: use one
   * resolver per world (createWorld does this by default).
   */
  warmStarting?: boolean;
}

/** Impulses remembered for one contact point between steps. */
interface CachedPoint {
  /** Contact point in body A's local frame (stable while the pair rests) */
  localA: Vector2;
  normalImpulse: number;
  tangentImpulse: number;
}

/**
 * A cached point matches a new one if they are this close (world units) in
 * body A's local frame; farther means the contact moved (sliding, rolling).
 */
const WARM_START_MATCH_DISTANCE = 1;

/** Solver state for one contact point. */
interface PointConstraint {
  rA: Vector2;
  rB: Vector2;
  /** Effective inverse mass along the normal / tangent */
  normalK: number;
  tangentK: number;
  /** Target normal velocity: bounce speed, 0, or (speculative) -gap/dt */
  targetNormalVelocity: number;
  /** Accumulated normal impulse (≥ 0) */
  normalImpulse: number;
  /** Accumulated friction impulse along the tangent */
  tangentImpulse: number;
}

/** Solver state for one contact (1 or 2 points). */
interface ContactConstraint {
  bodyA: Body;
  bodyB: Body;
  normal: Vector2;
  tangent: Vector2;
  friction: number;
  points: PointConstraint[];
  /** 2x2 normal mass matrix for block solving (null for 1 point or ill-conditioned) */
  block: { k11: number; k12: number; k22: number } | null;
}

/** Velocity of a body at a point offset `r` from its center: v + ω × r. */
const velocityAt = (body: Body, r: Vector2): Vector2 => ({
  x: body.velocity.x - body.angularVelocity * r.y,
  y: body.velocity.y + body.angularVelocity * r.x,
});

/** Relative velocity of B with respect to A at a contact point. */
const relativeVelocity = (c: ContactConstraint, p: PointConstraint): Vector2 =>
  Vec2.sub(velocityAt(c.bodyB, p.rB), velocityAt(c.bodyA, p.rA));

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
 * Used by `step()` in two phases, around position integration:
 * 1. `solveVelocities`: sequential impulses (Box2D style) over every contact
 *    of the step together, for `iterations` passes. Each point's accumulated
 *    impulse is clamped (normal ≥ 0, |friction| ≤ μ × normal); 2-point
 *    contacts are solved exactly as a 2x2 block so boxes stay flat.
 * 2. `correctPositions`: linear projection of the remaining overlap.
 *
 * Contact details:
 * - Rotation: angular terms in the effective mass, so off-center hits spin
 *   bodies and tilted boxes tip onto a face
 * - Restitution: target normal velocity is -e × approach speed, for
 *   approaches faster than `restitutionThreshold`
 * - Speculative points (reported by SAT slightly above the surface) may
 *   close their gap within the step but not overshoot it
 *
 * Math (per point, r = contact point - body center):
 * - vRel = (vB + ωB × rB) - (vA + ωA × rA)
 * - Δjn = (target - vRel · n) / K(n), accumulated jn clamped to ≥ 0
 * - Δjt = -(vRel · t) / K(t), accumulated jt clamped to [-μ jn, μ jn]
 * - K(d) = 1/mA + 1/mB + (rA×d)²/IA + (rB×d)²/IB
 *
 * `resolve()` handles a single contact on its own (both phases), for
 * custom pipelines.
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

  /** Solver iterations per step. */
  private readonly iterations: number;

  /** Approach speed below which contacts don't bounce. */
  private readonly restitutionThreshold: number;

  /** Whether to reuse impulses from the previous step. */
  private readonly warmStarting: boolean;

  /** Last step's impulses per body pair ("idA|idB"), for warm starting. */
  private cache = new Map<string, CachedPoint[]>();

  /**
   * Creates an impulse resolver.
   * @param options - Resolver options (combine rules, iterations, restitution threshold)
   * @throws Error if a combine option is an unknown rule name
   * @throws RangeError if iterations is not a positive integer, or the
   *   restitution threshold is negative or not finite
   */
  constructor(options: ImpulseResolverOptions = {}) {
    this.combineRestitution = resolveCombineRule(options.restitutionCombine ?? 'min');
    this.combineFriction = resolveCombineRule(options.frictionCombine ?? 'average');
    const iterations = options.iterations ?? 10;
    if (!Number.isInteger(iterations) || iterations < 1) {
      throw new RangeError(`ImpulseResolver: iterations must be a positive integer (got ${iterations})`);
    }
    this.iterations = iterations;
    const threshold = options.restitutionThreshold ?? 10;
    if (!Number.isFinite(threshold) || threshold < 0) {
      throw new RangeError(`ImpulseResolver: restitutionThreshold must be a finite number >= 0 (got ${threshold})`);
    }
    this.restitutionThreshold = threshold;
    this.warmStarting = options.warmStarting ?? true;
  }

  /**
   * Resolves a single collision on its own: normal and friction impulses,
   * then positional correction. `step()` uses `solveVelocities` and
   * `correctPositions` instead, which solve all contacts together.
   *
   * @param bodyA - First body (will be mutated)
   * @param bodyB - Second body (will be mutated)
   * @param contact - Contact information from narrow phase
   */
  resolve(bodyA: Body, bodyB: Body, contact: Contact): void {
    const pairs = [{ bodyA, bodyB, contact }];
    this.solveVelocities(pairs);
    this.correctPositions(pairs);
  }

  /**
   * Solves the velocity phase for all contacts together.
   *
   * @param contacts - Every contact found this step
   * @param dt - Time step in seconds; enables speculative points (without
   *   it, points above the surface are ignored)
   * @param gravity - World gravity already applied to velocities this step;
   *   removed from the approach speed used for restitution so bounces
   *   don't gain g·dt of speed
   */
  solveVelocities(contacts: readonly ContactPair[], dt?: number, gravity?: Vector2): void {
    const constraints: ContactConstraint[] = [];
    for (const pair of contacts) {
      const constraint = this.prepare(pair, dt, gravity);
      if (constraint) constraints.push(constraint);
    }

    // Warm start from last step's impulses (batch solves in step() only)
    const warm = this.warmStarting && dt !== undefined;
    if (warm) for (const c of constraints) this.applyWarmStart(c);

    for (let iteration = 0; iteration < this.iterations; iteration++) {
      for (const c of constraints) {
        this.solveFriction(c);
        if (c.block) this.solveNormalBlock(c);
        else this.solveNormalSequential(c);
      }
    }

    // Remember this step's impulses; contacts that ended are dropped
    if (warm) {
      this.cache = new Map();
      for (const c of constraints) {
        const toLocalA = Transform.create(c.bodyA.position, c.bodyA.rotation);
        this.cache.set(
          `${c.bodyA.id}|${c.bodyB.id}`,
          c.points.map((p) => ({
            localA: Transform.inverseTransformPoint(toLocalA, Vec2.add(c.bodyA.position, p.rA)),
            normalImpulse: p.normalImpulse,
            tangentImpulse: p.tangentImpulse,
          }))
        );
      }
    }
  }

  /**
   * Seeds a contact's accumulated impulses from the previous step (matching
   * points by position in body A's frame) and applies them.
   */
  private applyWarmStart(c: ContactConstraint): void {
    const cached = this.cache.get(`${c.bodyA.id}|${c.bodyB.id}`);
    if (!cached) return;

    const toLocalA = Transform.create(c.bodyA.position, c.bodyA.rotation);
    for (const p of c.points) {
      const local = Transform.inverseTransformPoint(toLocalA, Vec2.add(c.bodyA.position, p.rA));
      let best: CachedPoint | undefined;
      let bestDistance = WARM_START_MATCH_DISTANCE;
      for (const candidate of cached) {
        const d = Vec2.distance(candidate.localA, local);
        if (d < bestDistance) {
          bestDistance = d;
          best = candidate;
        }
      }
      if (!best) continue;

      p.normalImpulse = best.normalImpulse;
      p.tangentImpulse = best.tangentImpulse;
      const j = Vec2.add(Vec2.scale(c.normal, p.normalImpulse), Vec2.scale(c.tangent, p.tangentImpulse));
      applyImpulsePair(c.bodyA, c.bodyB, p.rA, p.rB, j);
    }
  }

  /**
   * Pushes overlapping bodies apart along each contact normal
   * (linear projection of the overlap beyond the slop).
   *
   * Contacts already separating faster than `restitutionThreshold` (a
   * bounce) are skipped: those bodies leave on their own, and lifting them
   * out as well would add energy to every bounce.
   *
   * @param contacts - Contacts to correct
   */
  correctPositions(contacts: readonly ContactPair[]): void {
    for (const { bodyA, bodyB, contact } of contacts) {
      if (bodyA.isSensor || bodyB.isSensor) continue;
      const totalInvMass = bodyA.invMass + bodyB.invMass;
      if (totalInvMass === 0) continue;

      const separatingSpeed = Vec2.dot(
        Vec2.sub(
          velocityAt(bodyB, Vec2.sub(contact.point, bodyB.position)),
          velocityAt(bodyA, Vec2.sub(contact.point, bodyA.position))
        ),
        contact.normal
      );
      if (separatingSpeed > this.restitutionThreshold) continue;

      // Don't correct small penetrations (prevent jitter)
      const correction = Math.max(contact.depth - this.slop, 0);
      if (correction <= 0) continue;

      const correctionVector = Vec2.scale(
        contact.normal,
        (correction / totalInvMass) * this.positionCorrectionPercent
      );

      // Move bodies apart proportional to their inverse masses
      bodyA.position = Vec2.add(bodyA.position, Vec2.scale(correctionVector, -bodyA.invMass));
      bodyB.position = Vec2.add(bodyB.position, Vec2.scale(correctionVector, bodyB.invMass));
    }
  }

  /**
   * Builds the solver state for a contact, or null if it needs no response
   * (sensors, two infinite-mass bodies, no usable points).
   */
  private prepare(
    { bodyA, bodyB, contact }: ContactPair,
    dt: number | undefined,
    gravity: Vector2 | undefined
  ): ContactConstraint | null {
    // Sensors only detect; infinite-mass pairs cannot respond (x/0 → NaN)
    if (bodyA.isSensor || bodyB.isSensor) return null;
    if (bodyA.invMass + bodyB.invMass === 0) return null;

    const n = contact.normal;
    const tangent = Vec2.perpendicular(n);
    const restitution = this.combineRestitution(bodyA.material.restitution, bodyB.material.restitution);
    const points = contact.points?.length ? contact.points : [contact.point];

    // Relative velocity this step's gravity added along the normal (only
    // dynamic bodies are accelerated by it)
    let gravityApproach = 0;
    if (gravity && dt !== undefined) {
      const gA = bodyA.type === 'dynamic' ? 1 : 0;
      const gB = bodyB.type === 'dynamic' ? 1 : 0;
      gravityApproach = (gB - gA) * Vec2.dot(gravity, n) * dt;
    }

    const constraint: ContactConstraint = {
      bodyA,
      bodyB,
      normal: n,
      tangent,
      friction: this.combineFriction(bodyA.material.friction, bodyB.material.friction),
      points: [],
      block: null,
    };

    points.forEach((p, i) => {
      const depth = contact.pointDepths?.[i] ?? contact.depth;
      // Speculative point above the surface: usable only with a time step
      if (depth < 0 && dt === undefined) return;

      const rA = Vec2.sub(p, bodyA.position);
      const rB = Vec2.sub(p, bodyB.position);
      const point: PointConstraint = {
        rA,
        rB,
        normalK: effectiveInvMass(bodyA, bodyB, rA, rB, n),
        tangentK: effectiveInvMass(bodyA, bodyB, rA, rB, tangent),
        targetNormalVelocity: 0,
        normalImpulse: 0,
        tangentImpulse: 0,
      };

      if (depth < 0) {
        // Allowed to approach just enough to close the gap this step
        point.targetNormalVelocity = depth / dt!;
      } else {
        // Approach speed from before this step's gravity (bounce on that, not on
        // the extra g·dt the body picked up while already in contact)
        const approach = Vec2.dot(relativeVelocity(constraint, point), n) - gravityApproach;
        if (-approach > this.restitutionThreshold) point.targetNormalVelocity = -restitution * approach;
      }
      constraint.points.push(point);
    });

    if (constraint.points.length === 0) return null;

    const [p1, p2] = constraint.points;
    if (p1 && p2) {
      const k12 =
        bodyA.invMass +
        bodyB.invMass +
        bodyA.invInertia * Vec2.cross(p1.rA, n) * Vec2.cross(p2.rA, n) +
        bodyB.invInertia * Vec2.cross(p1.rB, n) * Vec2.cross(p2.rB, n);
      // Use the block solver only when well-conditioned (points not coincident)
      if (p1.normalK * p1.normalK < 1000 * (p1.normalK * p2.normalK - k12 * k12)) {
        constraint.block = { k11: p1.normalK, k12, k22: p2.normalK };
      }
    }

    return constraint;
  }

  /** Coulomb friction at each point: stop sliding, within μ × normal impulse. */
  private solveFriction(c: ContactConstraint): void {
    if (c.friction <= 0) return;
    for (const p of c.points) {
      const vt = Vec2.dot(relativeVelocity(c, p), c.tangent);
      const limit = c.friction * p.normalImpulse;
      const accumulated = Math.max(-limit, Math.min(limit, p.tangentImpulse - vt / p.tangentK));
      const applied = accumulated - p.tangentImpulse;
      p.tangentImpulse = accumulated;
      if (applied !== 0) applyImpulsePair(c.bodyA, c.bodyB, p.rA, p.rB, Vec2.scale(c.tangent, applied));
    }
  }

  /** Normal impulses one point at a time, accumulated and clamped to ≥ 0. */
  private solveNormalSequential(c: ContactConstraint): void {
    for (const p of c.points) {
      const vn = Vec2.dot(relativeVelocity(c, p), c.normal);
      const accumulated = Math.max(p.normalImpulse + (p.targetNormalVelocity - vn) / p.normalK, 0);
      const applied = accumulated - p.normalImpulse;
      p.normalImpulse = accumulated;
      if (applied !== 0) applyImpulsePair(c.bodyA, c.bodyB, p.rA, p.rB, Vec2.scale(c.normal, applied));
    }
  }

  /**
   * Exact solve of a 2-point contact's normal impulses (Box2D's block
   * solver): find accumulated impulses x ≥ 0 with post-impulse normal
   * velocities vn ≥ target and x_i (vn_i - target_i) = 0, trying
   * both-active, first-only, second-only, then none.
   */
  private solveNormalBlock(c: ContactConstraint): void {
    const [p1, p2] = c.points as [PointConstraint, PointConstraint];
    const { k11, k12, k22 } = c.block!;
    const a1 = p1.normalImpulse;
    const a2 = p2.normalImpulse;

    // b = (vn - target) - K a: velocity error with the current impulses removed
    const b1 = Vec2.dot(relativeVelocity(c, p1), c.normal) - p1.targetNormalVelocity - (k11 * a1 + k12 * a2);
    const b2 = Vec2.dot(relativeVelocity(c, p2), c.normal) - p2.targetNormalVelocity - (k12 * a1 + k22 * a2);

    let x1: number;
    let x2: number;
    const det = k11 * k22 - k12 * k12;
    const both1 = -(k22 * b1 - k12 * b2) / det;
    const both2 = -(k11 * b2 - k12 * b1) / det;
    if (both1 >= 0 && both2 >= 0) {
      [x1, x2] = [both1, both2];
    } else if (-b1 / k11 >= 0 && k12 * (-b1 / k11) + b2 >= 0) {
      [x1, x2] = [-b1 / k11, 0];
    } else if (-b2 / k22 >= 0 && k12 * (-b2 / k22) + b1 >= 0) {
      [x1, x2] = [0, -b2 / k22];
    } else if (b1 >= 0 && b2 >= 0) {
      [x1, x2] = [0, 0];
    } else {
      // No consistent case (numerical edge): fall back to sequential
      this.solveNormalSequential(c);
      return;
    }

    p1.normalImpulse = x1;
    p2.normalImpulse = x2;
    const n = c.normal;
    if (x1 !== a1) applyImpulsePair(c.bodyA, c.bodyB, p1.rA, p1.rB, Vec2.scale(n, x1 - a1));
    if (x2 !== a2) applyImpulsePair(c.bodyA, c.bodyB, p2.rA, p2.rB, Vec2.scale(n, x2 - a2));
  }
}
