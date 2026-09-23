import type { Body } from '../../types/Body.js';
import type { Contact } from '../../types/Contact.js';
import type { Vector2 } from '../../core/Vector2.js';
import { toWorldPolygon, type WorldPolygon } from './polygonGeometry.js';

/**
 * Tolerance (world units) for preferring bodyA's face as the reference face.
 * Without a bias the reference flips between bodies on near-ties, which makes
 * the contact normal and points jitter from frame to frame.
 */
const REFERENCE_FACE_TOLERANCE = 0.01;

/**
 * Clipped points up to this far above the reference face (world units) are
 * kept in the manifold. Without it a box tilted by a hair touches with one
 * corner only, and the resolver cannot keep it flat; the kept point only
 * receives an impulse if it is approaching (same idea as Box2D's linear slop).
 */
const CONTACT_MARGIN = 0.5;

interface Separation {
  /** Largest separation found; > 0 means a separating axis exists */
  separation: number;
  /** Face of the polygon that produced it */
  faceIndex: number;
}

/**
 * For each face of `poly`, the separation is how far the other polygon's
 * deepest vertex lies outside that face. Returns the face with the largest one.
 */
const findMaxSeparation = (poly: WorldPolygon, other: WorldPolygon): Separation => {
  let best: Separation = { separation: -Infinity, faceIndex: 0 };

  for (let i = 0; i < poly.vertices.length; i++) {
    const n = poly.normals[i]!;
    const v = poly.vertices[i]!;

    let minDistance = Infinity;
    for (const w of other.vertices) {
      const d = n.x * (w.x - v.x) + n.y * (w.y - v.y);
      if (d < minDistance) minDistance = d;
    }

    if (minDistance > best.separation) best = { separation: minDistance, faceIndex: i };
  }

  return best;
};

/**
 * Keeps the part of segment [p1, p2] on the side where dot(normal, p) <= offset.
 * Returns 0, 1 or 2 points.
 */
const clipSegment = (points: Vector2[], normal: Vector2, offset: number): Vector2[] => {
  const [p1, p2] = points;
  if (!p1 || !p2) return points;

  const d1 = normal.x * p1.x + normal.y * p1.y - offset;
  const d2 = normal.x * p2.x + normal.y * p2.y - offset;
  const out: Vector2[] = [];

  if (d1 <= 0) out.push(p1);
  if (d2 <= 0) out.push(p2);

  if (d1 * d2 < 0) {
    const t = d1 / (d1 - d2);
    out.push({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
  }

  return out;
};

/**
 * Detects collision between two convex polygons (rectangles or polygons)
 * using the Separating Axis Theorem, with a clipped contact manifold.
 *
 * Algorithm:
 * 1. For every edge normal of A and of B, measure the separation of the
 *    other polygon. Any positive separation → no collision.
 * 2. The face with the least penetration is the reference face (A's face is
 *    preferred on near-ties, for frame-to-frame stability).
 * 3. On the other (incident) polygon, pick the edge most anti-parallel to it.
 * 4. Clip that incident edge to the reference face's side planes; the clipped
 *    points below (or within a 0.5-unit margin of) the reference face are
 *    the contact points (1 or 2).
 *
 * @param bodyA - Rectangle or polygon body
 * @param bodyB - Rectangle or polygon body
 * @returns Contact (normal from A to B, depth = deepest penetration,
 *   `points` = contact points on the incident polygon, `pointDepths` = their
 *   depths (negative within the speculative margin), `point` = their
 *   midpoint), or null if not colliding
 *
 * @example
 * const contact = detectPolygonPolygon(box, floor);
 * contact?.points; // two points when a box rests flat on the floor
 */
export function detectPolygonPolygon(bodyA: Body, bodyB: Body): Contact | null {
  const polyA = toWorldPolygon(bodyA);
  const polyB = toWorldPolygon(bodyB);
  if (!polyA || !polyB) return null;

  const sepA = findMaxSeparation(polyA, polyB);
  if (sepA.separation > 0) return null;

  const sepB = findMaxSeparation(polyB, polyA);
  if (sepB.separation > 0) return null;

  // Reference face: least penetration, biased toward A
  const flip = sepB.separation > sepA.separation + REFERENCE_FACE_TOLERANCE;
  const reference = flip ? polyB : polyA;
  const incident = flip ? polyA : polyB;
  const refIndex = flip ? sepB.faceIndex : sepA.faceIndex;

  const refNormal = reference.normals[refIndex]!;
  const r1 = reference.vertices[refIndex]!;
  const r2 = reference.vertices[(refIndex + 1) % reference.vertices.length]!;

  // Incident edge: the face of the incident polygon most anti-parallel to refNormal
  let incidentIndex = 0;
  let minDot = Infinity;
  for (let i = 0; i < incident.normals.length; i++) {
    const n = incident.normals[i]!;
    const d = n.x * refNormal.x + n.y * refNormal.y;
    if (d < minDot) {
      minDot = d;
      incidentIndex = i;
    }
  }
  const incidentEdge = [
    incident.vertices[incidentIndex]!,
    incident.vertices[(incidentIndex + 1) % incident.vertices.length]!,
  ];

  // Clip the incident edge to the reference face's extent (its two side planes)
  const tangent = { x: r2.x - r1.x, y: r2.y - r1.y };
  const tangentLength = Math.hypot(tangent.x, tangent.y);
  if (tangentLength === 0) return null;
  tangent.x /= tangentLength;
  tangent.y /= tangentLength;

  let clipped = clipSegment(
    incidentEdge,
    { x: -tangent.x, y: -tangent.y },
    -(tangent.x * r1.x + tangent.y * r1.y)
  );
  clipped = clipSegment(clipped, tangent, tangent.x * r2.x + tangent.y * r2.y);

  // Keep the clipped points below (or within CONTACT_MARGIN of) the reference face
  const points: Vector2[] = [];
  const pointDepths: number[] = [];
  let depth = 0;
  let touching = false;
  for (const p of clipped) {
    const separation = refNormal.x * (p.x - r1.x) + refNormal.y * (p.y - r1.y);
    if (separation <= CONTACT_MARGIN) {
      points.push(p);
      pointDepths.push(-separation);
      depth = Math.max(depth, -separation);
      if (separation <= 0) touching = true;
    }
  }
  if (!touching) return null;

  // The reference normal points out of the reference polygon, toward the
  // incident one. Contact normals must point from A to B.
  const normal = flip ? { x: -refNormal.x, y: -refNormal.y } : { ...refNormal };

  const point =
    points.length === 1
      ? points[0]!
      : { x: (points[0]!.x + points[1]!.x) * 0.5, y: (points[0]!.y + points[1]!.y) * 0.5 };

  return { point, points, pointDepths, normal, depth };
}
