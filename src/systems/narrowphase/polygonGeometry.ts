import type { Body } from '../../types/Body.js';
import type { Vector2 } from '../../core/Vector2.js';
import * as Transform from '../../core/Transform.js';

/**
 * A convex polygon in world space, ready for collision tests.
 * Vertices have positive winding (signed area > 0), so for edge
 * i → i+1 the outward normal is (e.y, -e.x) normalized.
 */
export interface WorldPolygon {
  vertices: Vector2[];
  /** normals[i] is the outward unit normal of edge vertices[i] → vertices[i+1] */
  normals: Vector2[];
}

/**
 * Returns the world-space vertices and outward edge normals of a
 * rectangle or polygon body, or null for other shapes.
 *
 * @param body - A body with a rectangle or polygon shape
 * @returns World polygon, or null if the body has no vertices
 */
export const toWorldPolygon = (body: Body): WorldPolygon | null => {
  if (body.shape.type !== 'rectangle' && body.shape.type !== 'polygon') {
    return null;
  }

  const transform = Transform.create(body.position, body.rotation);
  const vertices = body.shape.vertices.map((v) => Transform.transformPoint(transform, v));
  const normals: Vector2[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i]!;
    const v2 = vertices[(i + 1) % vertices.length]!;
    const ex = v2.x - v1.x;
    const ey = v2.y - v1.y;
    const length = Math.hypot(ex, ey);
    normals.push(length > 0 ? { x: ey / length, y: -ex / length } : { x: 0, y: 0 });
  }

  return { vertices, normals };
};
