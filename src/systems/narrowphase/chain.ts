import type { Body } from '../../types/Body.js';
import type { Contact } from '../../types/Contact.js';
import type { Vector2 } from '../../core/Vector2.js';
import { toWorldPolygon } from './polygonGeometry.js';

/** Speculative margin (world units), same as the polygon detector's. */
const CONTACT_MARGIN = 0.5;

/** One segment of a chain in world space. */
export interface ChainSegment {
  a: Vector2;
  b: Vector2;
  /** True if `a` / `b` is a free end (not shared with a neighbouring segment) */
  openStart: boolean;
  openEnd: boolean;
}

/**
 * World-space segments of a chain body (empty for other shapes).
 * @param body - A chain body
 * @returns Its segments in order
 */
export const chainSegments = (body: Body): ChainSegment[] => {
  if (body.shape.type !== 'chain') return [];
  const cos = Math.cos(body.rotation);
  const sin = Math.sin(body.rotation);
  const points = body.shape.vertices.map((v) => ({
    x: body.position.x + v.x * cos - v.y * sin,
    y: body.position.y + v.x * sin + v.y * cos,
  }));
  const loop = body.shape.loop;
  const count = loop ? points.length : points.length - 1;
  const segments: ChainSegment[] = [];
  for (let i = 0; i < count; i++) {
    segments.push({
      a: points[i]!,
      b: points[(i + 1) % points.length]!,
      openStart: !loop && i === 0,
      openEnd: !loop && i === count - 1,
    });
  }
  return segments;
};

/** Closest point to p on segment ab, with its parameter s ∈ [0, 1]. */
const closestOnSegment = (p: Vector2, a: Vector2, b: Vector2): { point: Vector2; s: number } => {
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const s = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / (ex * ex + ey * ey)));
  return { point: { x: a.x + ex * s, y: a.y + ey * s }, s };
};

/**
 * Detects collision between a circle (A) and a chain (B).
 *
 * Uses the single closest point on the whole chain. At a joint that point is
 * the shared vertex whichever segment it is measured from, so the contact
 * normal turns continuously and a rolling ball doesn't bump over joints
 * (rows of separate boxes produce a new, slightly different contact per box).
 *
 * @param bodyA - Circle body
 * @param bodyB - Chain body
 * @returns Contact (normal from circle to chain), or null
 */
export function detectCircleChain(bodyA: Body, bodyB: Body): Contact | null {
  if (bodyA.shape.type !== 'circle' || bodyB.shape.type !== 'chain') return null;
  const c = bodyA.position;
  const radius = bodyA.shape.radius;

  let best: { point: Vector2; distance: number; segment: ChainSegment } | null = null;
  for (const segment of chainSegments(bodyB)) {
    const { point } = closestOnSegment(c, segment.a, segment.b);
    const distance = Math.hypot(point.x - c.x, point.y - c.y);
    if (distance <= radius && (!best || distance < best.distance)) best = { point, distance, segment };
  }
  if (!best) return null;

  let normal: Vector2;
  if (best.distance > 1e-9) {
    normal = { x: (best.point.x - c.x) / best.distance, y: (best.point.y - c.y) / best.distance };
  } else {
    // Center exactly on the line: push out along the segment's normal
    const ex = best.segment.b.x - best.segment.a.x;
    const ey = best.segment.b.y - best.segment.a.y;
    const length = Math.hypot(ex, ey);
    normal = { x: -ey / length, y: ex / length };
  }
  const depth = radius - best.distance;
  return { point: best.point, points: [best.point], pointDepths: [depth], normal, depth };
}

/**
 * Detects collision between a rectangle/polygon (A) and a chain (B).
 *
 * Each segment acts as a one-sided wall facing the polygon: it pushes only
 * along its own normal, and only where the polygon overlaps the segment's
 * extent. Endpoint caps apply only at the chain's free ends. This is what
 * keeps a box sliding across an interior joint from catching on the next
 * segment's edge (Box2D gets the same effect with "ghost vertices").
 * The deepest segment wins; its penetrating vertices (up to 2) are the points.
 *
 * @param bodyA - Rectangle or polygon body
 * @param bodyB - Chain body
 * @returns Contact (normal from polygon to chain), or null
 */
export function detectPolygonChain(bodyA: Body, bodyB: Body): Contact | null {
  if (bodyB.shape.type !== 'chain') return null;
  const polygon = toWorldPolygon(bodyA);
  if (!polygon) return null;
  const center = bodyA.position;

  // Deepest raw penetration so far (negative = only within the speculative margin)
  let best: Contact | null = null;
  let bestScore = -Infinity;
  const offer = (contact: Contact, score: number) => {
    if (score > bestScore) {
      best = contact;
      bestScore = score;
    }
  };

  for (const segment of chainSegments(bodyB)) {
    const { a, b } = segment;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const length = Math.hypot(ex, ey);
    const t = { x: ex / length, y: ey / length };
    // Segment normal, oriented toward the polygon's side
    let n = { x: -t.y, y: t.x };
    if (n.x * (center.x - a.x) + n.y * (center.y - a.y) < 0) n = { x: -n.x, y: -n.y };

    // Vertices below (or within the margin of) the segment's line, inside its extent
    const candidates: { point: Vector2; depth: number }[] = [];
    let tMin = Infinity;
    let tMax = -Infinity;
    for (const v of polygon.vertices) {
      const along = (v.x - a.x) * t.x + (v.y - a.y) * t.y;
      tMin = Math.min(tMin, along);
      tMax = Math.max(tMax, along);
      const height = (v.x - a.x) * n.x + (v.y - a.y) * n.y;
      if (height <= CONTACT_MARGIN && along >= 0 && along <= length) {
        candidates.push({ point: v, depth: -height });
      }
    }
    // Polygon must overlap the segment's extent along the tangent
    if (tMax < 0 || tMin > length) continue;

    // Axis 1: the segment's own normal (deepest penetrating vertices, up to 2)
    candidates.sort((p, q) => q.depth - p.depth);
    const chosen = candidates.slice(0, 2);
    let segmentContact: Contact | null = null;
    let segmentDepth = -Infinity;
    if (chosen.length > 0) {
      const points = chosen.map((c) => c.point);
      segmentDepth = chosen[0]!.depth;
      segmentContact = {
        point:
          points.length === 1
            ? points[0]!
            : { x: (points[0]!.x + points[1]!.x) / 2, y: (points[0]!.y + points[1]!.y) / 2 },
        points,
        pointDepths: chosen.map((c) => c.depth),
        // Contact normals point from A (polygon) to B (chain): against n
        normal: { x: -n.x, y: -n.y },
        depth: Math.max(0, segmentDepth),
      };
    }

    // Axis 2 (free ends only): the chain endpoint poking into one of the
    // polygon's faces. As in SAT, the shallower way out wins for this segment.
    for (const [end, open] of [[a, segment.openStart], [b, segment.openEnd]] as const) {
      if (!open) continue;
      let separation = -Infinity;
      let faceNormal: Vector2 = n;
      for (let i = 0; i < polygon.vertices.length; i++) {
        const fn = polygon.normals[i]!;
        const fv = polygon.vertices[i]!;
        const sep = fn.x * (end.x - fv.x) + fn.y * (end.y - fv.y);
        if (sep > separation) {
          separation = sep;
          faceNormal = fn;
        }
      }
      if (separation >= 0) continue; // endpoint outside the polygon
      const endDepth = -separation;
      if (segmentContact && endDepth >= segmentDepth) continue;
      // The polygon's face normal points out of A toward the endpoint (A → B)
      segmentContact = {
        point: end,
        points: [end],
        pointDepths: [endDepth],
        normal: { x: faceNormal.x, y: faceNormal.y },
        depth: endDepth,
      };
      segmentDepth = endDepth;
    }

    if (segmentContact) offer(segmentContact, segmentDepth);
  }

  // Report only when something actually touches (not just speculative points)
  return bestScore >= 0 ? best : null;
}
