import type { Body } from '../../types/Body.js';
import type { Contact } from '../../types/Contact.js';
import * as Transform from '../../core/Transform.js';
import * as math from '../../core/math.js';

/**
 * Detects collision between a circle body (A) and a rectangle body (B).
 *
 * Works for rotated rectangles by moving the circle center into the
 * rectangle's local space, where the rectangle is axis-aligned.
 *
 * Algorithm:
 * 1. Transform circle center into rectangle local space
 * 2. Clamp it to the rectangle's half extents → closest point on the rectangle
 * 3. Center outside the rectangle: collide if the closest point is within the radius
 * 4. Center inside the rectangle: push out through the nearest face
 *
 * Math (local space, half extents hw, hh):
 * - closest = (clamp(c.x, -hw, hw), clamp(c.y, -hh, hh))
 * - outside: depth = r - |c - closest|, normal ∝ closest - c
 * - inside:  depth = r + distance to nearest face, normal = inward face normal
 *
 * @param bodyA - Circle body
 * @param bodyB - Rectangle body
 * @returns Contact (normal from circle to rectangle, point on the rectangle
 *   surface closest to the circle center), or null if not colliding
 *
 * @example
 * const contact = detectCircleRectangle(ball, floor);
 * if (contact) resolver.resolve(ball, floor, contact);
 */
export function detectCircleRectangle(bodyA: Body, bodyB: Body): Contact | null {
  if (bodyA.shape.type !== 'circle' || bodyB.shape.type !== 'rectangle') {
    return null;
  }

  const radius = bodyA.shape.radius;
  const hw = bodyB.shape.width * 0.5;
  const hh = bodyB.shape.height * 0.5;
  const rectTransform = Transform.create(bodyB.position, bodyB.rotation);

  // Circle center in rectangle local space
  const center = Transform.inverseTransformPoint(rectTransform, bodyA.position);

  const inside = Math.abs(center.x) <= hw && Math.abs(center.y) <= hh;

  if (!inside) {
    // Closest point on the rectangle to the circle center
    const closest = {
      x: math.clamp(center.x, -hw, hw),
      y: math.clamp(center.y, -hh, hh),
    };
    const dx = closest.x - center.x;
    const dy = closest.y - center.y;
    const distanceSq = dx * dx + dy * dy;

    // Early exit: not colliding
    if (distanceSq > radius * radius) return null;

    const distance = Math.sqrt(distanceSq);
    // distance > 0 is guaranteed here: the center is outside the rectangle
    const localNormal = { x: dx / distance, y: dy / distance };

    return {
      point: Transform.transformPoint(rectTransform, closest),
      normal: Transform.transformDirection(rectTransform, localNormal),
      depth: radius - distance,
    };
  }

  // Center inside the rectangle: exit through the nearest face.
  // Distance from the center to each face along its axis.
  const toFaceX = hw - Math.abs(center.x);
  const toFaceY = hh - Math.abs(center.y);

  // Ties (e.g. dead center of a square) resolve toward the y axis, the
  // common case of a body sinking into a floor or landing on a platform.
  let localNormal: { x: number; y: number };
  let facePoint: { x: number; y: number };
  let toFace: number;
  if (toFaceX < toFaceY) {
    const side = center.x >= 0 ? 1 : -1;
    localNormal = { x: -side, y: 0 };
    facePoint = { x: side * hw, y: center.y };
    toFace = toFaceX;
  } else {
    const side = center.y >= 0 ? 1 : -1;
    localNormal = { x: 0, y: -side };
    facePoint = { x: center.x, y: side * hh };
    toFace = toFaceY;
  }

  return {
    point: Transform.transformPoint(rectTransform, facePoint),
    normal: Transform.transformDirection(rectTransform, localNormal),
    depth: radius + toFace,
  };
}
