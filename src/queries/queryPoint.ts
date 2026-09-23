import type { World } from '../types/World.js';
import type { Body } from '../types/Body.js';
import type { Vector2 } from '../core/Vector2.js';
import type { QueryFilter } from '../types/Query.js';
import * as AABB from '../core/AABB.js';
import { toWorldPolygon } from '../systems/narrowphase/polygonGeometry.js';
import { passesFilter } from './filter.js';

/**
 * Whether a body's shape contains a world-space point (boundary included).
 *
 * @param body - The body to test
 * @param point - Point in world space
 * @returns True if the point is inside or on the shape
 */
export const bodyContainsPoint = (body: Body, point: Vector2): boolean => {
  if (!AABB.contains(body.aabb, point)) return false;

  if (body.shape.type === 'circle') {
    const dx = point.x - body.position.x;
    const dy = point.y - body.position.y;
    return dx * dx + dy * dy <= body.shape.radius * body.shape.radius;
  }

  const polygon = toWorldPolygon(body);
  if (!polygon) return false;
  // Convex: inside iff on the inner side of every edge
  return polygon.vertices.every((v, i) => {
    const n = polygon.normals[i]!;
    return n.x * (point.x - v.x) + n.y * (point.y - v.y) <= 1e-9;
  });
};

/**
 * Finds the bodies whose shape contains a point (e.g. under the mouse).
 *
 * @param world - The physics world
 * @param point - Point in world space
 * @param filter - Optional layer mask, sensor inclusion (default: included) and predicate
 * @returns Matching bodies, in world order
 * @example
 * const [picked] = queryPoint(world, mousePosition);
 */
export const queryPoint = (world: World, point: Vector2, filter?: QueryFilter): Body[] =>
  world.bodies.filter((body) => passesFilter(body, filter, true) && bodyContainsPoint(body, point));
