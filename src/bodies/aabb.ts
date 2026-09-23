import type { Body } from '../types/Body.js';
import type { Shape } from '../types/Shape.js';
import type { Vector2 } from '../core/Vector2.js';
import * as AABB from '../core/AABB.js';
import * as Transform from '../core/Transform.js';

/**
 * Computes the world-space AABB of a shape at the given position and rotation.
 * Handles rotation for rectangles and polygons (circles are rotation-invariant).
 *
 * @param shape - The body's shape (vertices in local space)
 * @param position - World-space position of the shape's origin
 * @param rotation - Rotation in radians
 * @returns The enclosing axis-aligned bounding box
 */
export const computeShapeAABB = (
  shape: Shape,
  position: Vector2,
  rotation: number
): AABB.AABB => {
  if (shape.type === 'circle') {
    const r = shape.radius;
    return AABB.fromCenter(position, { x: r, y: r });
  }

  if (shape.type === 'rectangle' && rotation === 0) {
    // Optimization: unrotated rectangle needs no vertex transform
    return AABB.fromCenter(position, {
      x: shape.width * 0.5,
      y: shape.height * 0.5,
    });
  }

  const transform = Transform.create(position, rotation);
  const worldVertices = shape.vertices.map((v) =>
    Transform.transformPoint(transform, v)
  );
  return AABB.fromPoints(worldVertices);
};

/**
 * Recomputes a body's AABB from its current position, rotation and shape.
 * Call this after moving a body manually (e.g. dragging it in an editor);
 * `step()` does it automatically for every body.
 *
 * @param body - The body to update (mutated in place)
 */
export const updateBodyAABB = (body: Body): void => {
  body.aabb = computeShapeAABB(body.shape, body.position, body.rotation);
};
