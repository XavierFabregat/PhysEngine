import type { World } from '../types/World.js';
import type { Body } from '../types/Body.js';
import type { Vector2 } from '../core/Vector2.js';
import { shouldCollide } from '../types/Body.js';
import { toWorldPolygon } from '../systems/narrowphase/polygonGeometry.js';
import { chainSegments } from '../systems/narrowphase/chain.js';

/**
 * How far (world units) a stopped bullet is left overlapping what it hit, so
 * the next step's narrow phase finds a real contact and the resolver bounces
 * it (a bullet parked exactly at the surface would never touch it).
 */
const CCD_SKIN = 0.1;

/**
 * Radius used for a bullet's swept test: the circle's radius, or a polygon's
 * inscribed radius (its core can't pass through anything; the small overlap
 * that a corner may add is resolved as a normal contact).
 */
const sweepRadius = (body: Body): number => {
  if (body.shape.type === 'circle') return body.shape.radius;
  if (body.shape.type === 'chain') return 0; // chains are never dynamic
  let inscribed = Infinity;
  const vertices = body.shape.vertices;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const length = Math.hypot(ex, ey);
    if (length === 0) continue;
    // Distance from the center of mass (local origin) to the edge's line
    inscribed = Math.min(inscribed, Math.abs(a.x * ey - a.y * ex) / length);
  }
  return Number.isFinite(inscribed) ? inscribed : 0;
};

/** Smallest t ≥ 0 where |p + t·d − c| = r, or null (also null if p starts inside). */
const rayCircleTime = (p: Vector2, d: Vector2, c: Vector2, r: number): number | null => {
  const mx = p.x - c.x;
  const my = p.y - c.y;
  const cc = mx * mx + my * my - r * r;
  if (cc <= 0) return null; // already overlapping: the regular contact handles it
  const a = d.x * d.x + d.y * d.y;
  const b = mx * d.x + my * d.y;
  if (b >= 0 || a === 0) return null; // moving away or not moving
  const discriminant = b * b - a * cc;
  if (discriminant < 0) return null;
  return (-b - Math.sqrt(discriminant)) / a;
};

/**
 * Earliest time t ∈ [0, 1] at which a circle of radius r, moving from p by d,
 * touches a convex polygon: a ray against the polygon inflated by r (edges
 * pushed out by r, corners rounded with radius r). Null if it never does or
 * if it already overlaps at the start.
 */
const sweepCirclePolygon = (p: Vector2, d: Vector2, r: number, target: Body): number | null => {
  const polygon = toWorldPolygon(target);
  if (!polygon) return null;
  const { vertices, normals } = polygon;

  // Already overlapping (center inside, or within r of the polygon)? Leave it to contacts.
  let maxSeparation = -Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const n = normals[i]!;
    const v = vertices[i]!;
    maxSeparation = Math.max(maxSeparation, n.x * (p.x - v.x) + n.y * (p.y - v.y));
  }
  if (maxSeparation <= 0) return null;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const s = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / (ex * ex + ey * ey)));
    if (Math.hypot(p.x - (a.x + ex * s), p.y - (a.y + ey * s)) < r) return null;
  }

  let best: number | null = null;
  const consider = (t: number | null) => {
    if (t !== null && t >= 0 && t <= 1 && (best === null || t < best)) best = t;
  };

  for (let i = 0; i < vertices.length; i++) {
    const n = normals[i]!;
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    // Edge pushed out by r: the circle's center touches it when the circle touches the edge
    const approach = n.x * d.x + n.y * d.y;
    if (approach < 0) {
      const distance = n.x * (p.x - a.x) + n.y * (p.y - a.y) - r;
      if (distance >= 0) {
        const t = distance / -approach;
        const hx = p.x + d.x * t - n.x * r;
        const hy = p.y + d.y * t - n.y * r;
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const s = ((hx - a.x) * ex + (hy - a.y) * ey) / (ex * ex + ey * ey);
        if (s >= 0 && s <= 1) consider(t);
      }
    }
    // Rounded corner
    consider(rayCircleTime(p, d, a, r));
  }
  return best;
};

/**
 * Earliest time t ∈ [0, 1] at which a circle of radius r moving from p by d
 * touches a chain: each segment inflated into a capsule (both sides pushed
 * out by r, rounded ends). Segments it already overlaps are skipped.
 */
const sweepCircleChain = (p: Vector2, d: Vector2, r: number, target: Body): number | null => {
  let best: number | null = null;
  for (const { a, b } of chainSegments(target)) {
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const length = Math.hypot(ex, ey);
    // Already within r of this segment: leave it to the regular contact
    const s0 = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / (length * length)));
    if (Math.hypot(p.x - (a.x + ex * s0), p.y - (a.y + ey * s0)) < r) continue;

    for (const side of [1, -1]) {
      const n = { x: (-ey / length) * side, y: (ex / length) * side };
      const approach = n.x * d.x + n.y * d.y;
      if (approach >= 0) continue;
      const distance = n.x * (p.x - a.x) + n.y * (p.y - a.y) - r;
      if (distance < 0) continue;
      const t = distance / -approach;
      const hx = p.x + d.x * t - n.x * r;
      const hy = p.y + d.y * t - n.y * r;
      const s = ((hx - a.x) * ex + (hy - a.y) * ey) / (length * length);
      if (s >= 0 && s <= 1 && t <= 1 && (best === null || t < best)) best = t;
    }
    for (const end of [a, b]) {
      const t = rayCircleTime(p, d, end, r);
      if (t !== null && t <= 1 && (best === null || t < best)) best = t;
    }
  }
  return best;
};

/** Swept AABB of the bullet's motion overlaps the target's AABB (cheap rejection). */
const sweptBoundsOverlap = (start: Vector2, end: Vector2, r: number, target: Body): boolean =>
  Math.min(start.x, end.x) - r <= target.aabb.max.x &&
  Math.max(start.x, end.x) + r >= target.aabb.min.x &&
  Math.min(start.y, end.y) - r <= target.aabb.max.y &&
  Math.max(start.y, end.y) + r >= target.aabb.min.y;

/**
 * Continuous collision detection for bullets (`isBullet: true`, dynamic).
 *
 * Called by `step()` after positions are integrated, with each bullet's
 * position from the start of the step. If the swept path crosses a body it
 * can collide with, the bullet is moved back to the earliest time of impact
 * (left overlapping by a small skin), so the next step's contact bounces it
 * instead of letting it tunnel through. Other bodies are taken at their
 * end-of-step positions.
 *
 * @param world - The physics world
 * @param starts - Bullet id → position at the start of the step
 * @internal
 */
export const sweepBullets = (world: World, starts: Map<string, Vector2>): void => {
  for (const bullet of world.bodies) {
    const start = starts.get(bullet.id);
    if (!start || bullet.type !== 'dynamic' || bullet.isSensor) continue;

    const end = bullet.position;
    const d = { x: end.x - start.x, y: end.y - start.y };
    if (d.x === 0 && d.y === 0) continue;
    const r = Math.max(0, sweepRadius(bullet) - CCD_SKIN);

    let earliest: number | null = null;
    for (const target of world.bodies) {
      if (target === bullet || target.isSensor || !shouldCollide(bullet, target)) continue;
      if (!sweptBoundsOverlap(start, end, r, target)) continue;

      const t =
        target.shape.type === 'circle'
          ? rayCircleTime(start, d, target.position, r + target.shape.radius)
          : target.shape.type === 'chain'
            ? sweepCircleChain(start, d, r, target)
            : sweepCirclePolygon(start, d, r, target);
      if (t !== null && t <= 1 && (earliest === null || t < earliest)) earliest = t;
    }

    if (earliest !== null && earliest < 1) {
      bullet.position = { x: start.x + d.x * earliest, y: start.y + d.y * earliest };
    }
  }
};

/**
 * Positions of every bullet at the start of a step (for `sweepBullets`).
 * @internal
 */
export const recordBulletStarts = (world: World): Map<string, Vector2> => {
  const starts = new Map<string, Vector2>();
  for (const b of world.bodies) {
    if (b.isBullet && b.type === 'dynamic') starts.set(b.id, { x: b.position.x, y: b.position.y });
  }
  return starts;
};
