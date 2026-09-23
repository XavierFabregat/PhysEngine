import type { World } from '../types/World.js';
import type { Body } from '../types/Body.js';
import type { Vector2 } from '../core/Vector2.js';
import type { RaycastOptions, RaycastHit } from '../types/Query.js';
import { toWorldPolygon } from '../systems/narrowphase/polygonGeometry.js';
import { passesFilter } from './filter.js';

/** Distance along a unit ray to where it hits a body, with the surface normal. */
interface ShapeHit {
  distance: number;
  normal: Vector2;
}

/**
 * Slab test: does the ray segment [0, maxDistance] cross the body's AABB?
 * Cheap rejection before the exact shape test.
 */
const rayHitsAABB = (body: Body, o: Vector2, d: Vector2, maxDistance: number): boolean => {
  let tMin = 0;
  let tMax = maxDistance;
  for (const axis of ['x', 'y'] as const) {
    const min = body.aabb.min[axis];
    const max = body.aabb.max[axis];
    if (d[axis] === 0) {
      if (o[axis] < min || o[axis] > max) return false;
      continue;
    }
    let t1 = (min - o[axis]) / d[axis];
    let t2 = (max - o[axis]) / d[axis];
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
};

/** Ray vs circle: smallest t ≥ 0 with |o + t d - c| = r. Origin inside → no hit. */
const rayCircle = (body: Body, radius: number, o: Vector2, d: Vector2): ShapeHit | null => {
  const mx = o.x - body.position.x;
  const my = o.y - body.position.y;
  const c = mx * mx + my * my - radius * radius;
  if (c < 0) return null; // starts inside

  const b = mx * d.x + my * d.y;
  if (b > 0) return null; // pointing away
  const discriminant = b * b - c;
  if (discriminant < 0) return null;

  const t = -b - Math.sqrt(discriminant);
  const px = o.x + d.x * t - body.position.x;
  const py = o.y + d.y * t - body.position.y;
  return { distance: t, normal: { x: px / radius, y: py / radius } };
};

/**
 * Ray vs convex polygon (Cyrus-Beck): clip the ray against every edge's
 * half-plane; the entry parameter is the hit. Origin inside → no hit.
 */
const rayPolygon = (body: Body, o: Vector2, d: Vector2): ShapeHit | null => {
  const polygon = toWorldPolygon(body);
  if (!polygon) return null;

  let tEnter = -Infinity;
  let tExit = Infinity;
  let enterNormal: Vector2 | null = null;

  for (let i = 0; i < polygon.vertices.length; i++) {
    const n = polygon.normals[i]!;
    const v = polygon.vertices[i]!;
    // Inside the edge's half-plane where n · (p - v) ≤ 0
    const numerator = n.x * (v.x - o.x) + n.y * (v.y - o.y);
    const denominator = n.x * d.x + n.y * d.y;

    if (denominator === 0) {
      if (numerator < 0) return null; // parallel and outside this edge
      continue;
    }
    const t = numerator / denominator;
    if (denominator < 0) {
      if (t > tEnter) {
        tEnter = t;
        enterNormal = n;
      }
    } else if (t < tExit) {
      tExit = t;
    }
    if (tEnter > tExit) return null;
  }

  // tEnter < 0 means the origin is inside (or the polygon is behind the ray)
  if (!enterNormal || tEnter < 0) return null;
  return { distance: tEnter, normal: { x: enterNormal.x, y: enterNormal.y } };
};

/**
 * Casts a ray and returns the closest body it hits.
 *
 * - Rays starting inside a shape ignore that shape (cast from inside your
 *   own body freely), as in Box2D
 * - Sensors are skipped unless `filter.includeSensors` is true, so trigger
 *   zones don't block line of sight
 *
 * @param world - The physics world
 * @param options - Origin, direction (normalized internally), optional
 *   maxDistance (default Infinity) and filter
 * @returns The closest hit, or null if the ray hits nothing within range
 * @throws RangeError if the direction has zero length or a value is not finite
 * @example
 * const hit = raycast(world, { origin: gun, direction: aim, maxDistance: 500 });
 * if (hit) console.log(hit.body.id, hit.point, hit.distance);
 */
export const raycast = (world: World, options: RaycastOptions): RaycastHit | null => {
  const { origin, direction, maxDistance = Infinity, filter } = options;
  const length = Math.hypot(direction.x, direction.y);
  if (!(length > 0) || !Number.isFinite(length)) {
    throw new RangeError('raycast: direction must be a finite, non-zero vector');
  }
  if (!Number.isFinite(origin.x) || !Number.isFinite(origin.y) || !(maxDistance >= 0)) {
    throw new RangeError('raycast: origin must be finite and maxDistance >= 0');
  }
  const d = { x: direction.x / length, y: direction.y / length };

  let best: RaycastHit | null = null;
  let bestDistance = maxDistance;

  for (const body of world.bodies) {
    if (!passesFilter(body, filter, false)) continue;
    if (!rayHitsAABB(body, origin, d, bestDistance)) continue;

    const hit =
      body.shape.type === 'circle'
        ? rayCircle(body, body.shape.radius, origin, d)
        : rayPolygon(body, origin, d);
    if (!hit || hit.distance > bestDistance) continue;

    bestDistance = hit.distance;
    best = {
      body,
      point: { x: origin.x + d.x * hit.distance, y: origin.y + d.y * hit.distance },
      normal: hit.normal,
      distance: hit.distance,
    };
  }

  return best;
};
