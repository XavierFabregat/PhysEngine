import type { World } from '../types/World.js';
import type { Body } from '../types/Body.js';
import type { QueryFilter } from '../types/Query.js';
import * as AABBMath from '../core/AABB.js';
import { passesFilter } from './filter.js';

/**
 * Finds the bodies whose shape overlaps an axis-aligned box (e.g. a
 * selection rectangle). Shapes are tested exactly with the world's narrow
 * phase, so a rotated box whose AABB touches the region but whose outline
 * doesn't is not returned.
 *
 * @param world - The physics world
 * @param bounds - Query box in world space
 * @param filter - Optional layer mask, sensor inclusion (default: included) and predicate
 * @returns Matching bodies, in world order
 * @example
 * const selected = queryAABB(world, { min: { x: 0, y: 0 }, max: { x: 200, y: 100 } });
 */
export const queryAABB = (world: World, bounds: AABBMath.AABB, filter?: QueryFilter): Body[] => {
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  if (!(width >= 0 && height >= 0)) return [];

  // Minimal stand-in body for the query region: detectors only read
  // shape, position and rotation (built by hand so no body ID is consumed).
  // Degenerate boxes (a point or a line) get a hair of thickness so the
  // polygon test has well-defined edge normals.
  const hw = Math.max(width, 1e-9) * 0.5;
  const hh = Math.max(height, 1e-9) * 0.5;
  const region = {
    id: '__queryAABB__',
    type: 'static',
    position: AABBMath.center(bounds),
    rotation: 0,
    aabb: bounds,
    shape: {
      type: 'rectangle',
      width: hw * 2,
      height: hh * 2,
      vertices: [
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh },
      ],
    },
  } as unknown as Body;

  return world.bodies.filter(
    (body) =>
      passesFilter(body, filter, true) &&
      AABBMath.overlaps(body.aabb, bounds) &&
      world.narrowPhase.detect(body, region) !== null
  );
};
