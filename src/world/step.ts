import type { World } from '../types/World.js';
import type { Body } from '../types/Body.js';
import * as AABB from '../core/AABB.js';
import * as Transform from '../core/Transform.js';

/**
 * Advances the physics simulation by one time step.
 * 
 * This is the main simulation loop function. Call this every frame
 * to update the physics world.
 * 
 * Current implementation:
 * 1. Integrates all bodies (updates positions/velocities)
 * 2. Updates AABBs for broad-phase collision detection
 * 3. Increments world time
 * 
 * Future: Will add collision detection and response between steps 1 and 2.
 * 
 * @param world - The physics world to simulate
 * @param dt - Time step in seconds (typically 1/60 for 60fps)
 * 
 * @example
 * const world = createWorld();
 * addBody(world, createCircle({ radius: 20 }));
 * 
 * // Game loop
 * function update() {
 *   step(world, 1/60);  // 60fps
 *   render();
 *   requestAnimationFrame(update);
 * }
 */
export const step = (world: World, dt: number): void => {
  // 1. Integrate all bodies (update positions and velocities)
  for (const body of world.bodies) {
    world.integrator.integrate(body, dt, world.gravity);
  }

  // 2. Update AABBs (needed for collision detection)
  for (const body of world.bodies) {
    updateBodyAABB(body);
  }

  // 3. TODO: Collision detection (broad + narrow phase)
  // 4. TODO: Collision response (impulses)

  // 5. Increment simulation time
  world.time += dt;
};

/**
 * Updates a body's AABB based on its current position and shape.
 * Handles rotation for rectangles and polygons.
 * 
 * @param body - The body to update
 */
function updateBodyAABB(body: Body): void {
  if (body.shape.type === 'circle') {
    // Circle AABB is simple - doesn't rotate
    const r = body.shape.radius;
    body.aabb = AABB.fromCenter(body.position, { x: r, y: r });
  } else if (body.shape.type === 'rectangle') {
    // Rectangle - if rotated, need to transform vertices
    if (body.rotation === 0) {
      // Optimization: no rotation
      const hw = body.shape.width * 0.5;
      const hh = body.shape.height * 0.5;
      body.aabb = AABB.fromCenter(body.position, { x: hw, y: hh });
    } else {
      // Transform vertices to world space
      const transform = Transform.create(body.position, body.rotation);
      const worldVertices = body.shape.vertices.map((v) =>
        Transform.transformPoint(transform, v)
      );
      body.aabb = AABB.fromPoints(worldVertices);
    }
  } else if (body.shape.type === 'polygon') {
    // Polygon - always need to transform vertices
    const transform = Transform.create(body.position, body.rotation);
    const worldVertices = body.shape.vertices.map((v) =>
      Transform.transformPoint(transform, v)
    );
    body.aabb = AABB.fromPoints(worldVertices);
  }
}

