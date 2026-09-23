import type { Body } from '../../types/Body.js';
import type { Contact } from '../../types/Contact.js';
import * as Vec2 from '../../core/Vector2.js';

/**
 * Detects collision between two circle bodies.
 * 
 * Circle-circle collision is the simplest and fastest collision test.
 * Algorithm:
 * 1. Calculate distance between centers
 * 2. Compare with sum of radii
 * 3. If overlapping, calculate contact point, normal, and depth
 * 
 * Math:
 * - distance = |posB - posA|
 * - overlap = (radiusA + radiusB) - distance
 * - normal = (posB - posA) / distance (unit vector from A to B)
 * - contact point = posA + normal * radiusA (on surface of circle A)
 * 
 * @param bodyA - First circle body
 * @param bodyB - Second circle body
 * @returns Contact information if colliding, null otherwise
 * 
 * @example
 * const contact = detectCircleCircle(ballA, ballB);
 * if (contact) {
 *   console.log('Collision depth:', contact.depth);
 * }
 */
export function detectCircleCircle(bodyA: Body, bodyB: Body): Contact | null {
  // Type guards - ensure both are circles
  if (bodyA.shape.type !== 'circle' || bodyB.shape.type !== 'circle') {
    return null;
  }

  const radiusA = bodyA.shape.radius;
  const radiusB = bodyB.shape.radius;

  // Vector from A to B
  const delta = Vec2.sub(bodyB.position, bodyA.position);
  const distanceSquared = Vec2.lengthSq(delta);

  // Sum of radii
  const radiusSum = radiusA + radiusB;
  const radiusSumSquared = radiusSum * radiusSum;

  // Early exit: not colliding
  if (distanceSquared > radiusSumSquared) {
    return null;
  }

  // Calculate actual distance (avoid sqrt when not needed)
  const distance = Math.sqrt(distanceSquared);

  // Edge case: circles at exact same position
  if (distance === 0) {
    // Arbitrary separation direction (push B to the right)
    return {
      point: { ...bodyA.position },
      normal: { x: 1, y: 0 },
      depth: radiusSum,
    };
  }

  // Penetration depth
  const depth = radiusSum - distance;

  // Contact normal (unit vector from A to B)
  const normal = Vec2.scale(delta, 1 / distance);

  // Contact point (on surface of circle A, along normal)
  const point = Vec2.add(bodyA.position, Vec2.scale(normal, radiusA));

  return {
    point,
    normal,
    depth,
  };
}

