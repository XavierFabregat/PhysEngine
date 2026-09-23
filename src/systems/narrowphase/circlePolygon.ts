import type { Body } from '../../types/Body.js';
import type { Contact } from '../../types/Contact.js';
import { toWorldPolygon } from './polygonGeometry.js';

/**
 * Detects collision between a circle body (A) and a convex polygon body (B).
 *
 * Algorithm (same approach as Box2D):
 * 1. Find the polygon face with the largest separation from the circle center.
 *    If that separation exceeds the radius, there is no collision.
 * 2. Center inside the polygon (separation < 0): push out through that face.
 * 3. Otherwise the closest feature is that face or one of its two vertices:
 *    project the center onto the face segment and clamp to its ends.
 *
 * @param bodyA - Circle body
 * @param bodyB - Polygon body (rectangles use detectCircleRectangle)
 * @returns Contact (normal from circle to polygon, point on the polygon
 *   boundary closest to the circle center), or null if not colliding
 */
export function detectCirclePolygon(bodyA: Body, bodyB: Body): Contact | null {
  if (bodyA.shape.type !== 'circle' || bodyB.shape.type !== 'polygon') {
    return null;
  }

  const polygon = toWorldPolygon(bodyB);
  if (!polygon) return null;

  const radius = bodyA.shape.radius;
  const c = bodyA.position;
  const { vertices, normals } = polygon;

  // Face with the largest separation from the circle center
  let faceIndex = 0;
  let separation = -Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const n = normals[i]!;
    const v = vertices[i]!;
    const s = n.x * (c.x - v.x) + n.y * (c.y - v.y);
    if (s > radius) return null;
    if (s > separation) {
      separation = s;
      faceIndex = i;
    }
  }

  const v1 = vertices[faceIndex]!;
  const v2 = vertices[(faceIndex + 1) % vertices.length]!;
  const faceNormal = normals[faceIndex]!;

  if (separation < 0) {
    // Center inside: exit through the nearest face
    const point = { x: c.x - faceNormal.x * separation, y: c.y - faceNormal.y * separation };
    return {
      point,
      points: [point],
      normal: { x: -faceNormal.x, y: -faceNormal.y },
      depth: radius - separation,
    };
  }

  // Closest point on the face segment (clamped to its vertices)
  const ex = v2.x - v1.x;
  const ey = v2.y - v1.y;
  const lengthSq = ex * ex + ey * ey;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((c.x - v1.x) * ex + (c.y - v1.y) * ey) / lengthSq)) : 0;
  const closest = { x: v1.x + ex * t, y: v1.y + ey * t };

  const dx = closest.x - c.x;
  const dy = closest.y - c.y;
  const distance = Math.hypot(dx, dy);
  if (distance > radius) return null;

  // distance 0 means the center sits exactly on the boundary: use the face normal
  const normal =
    distance > 0 ? { x: dx / distance, y: dy / distance } : { x: -faceNormal.x, y: -faceNormal.y };

  return { point: closest, points: [closest], normal, depth: radius - distance };
}
