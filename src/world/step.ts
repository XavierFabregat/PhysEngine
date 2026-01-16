import type { World } from '../types/World.js';
import type { Body } from '../types/Body.js';
import * as AABB from '../core/AABB.js';
import * as Transform from '../core/Transform.js';
import { detectCircleCircle } from '../systems/narrowphase/circleCircle.js';

/**
 * Advances the physics simulation by one time step.
 * 
 * This is the main simulation loop function. Call this every frame
 * to update the physics world.
 * 
 * Physics pipeline:
 * 1. Integration - Update positions/velocities from forces
 * 2. AABB Update - Update bounding boxes for collision detection
 * 3. Broad Phase - Find potentially colliding pairs (AABB overlap)
 * 4. Narrow Phase - Precise collision detection (geometry-based)
 * 5. Collision Response - Apply impulses and position correction
 * 6. Time Increment - Update world time
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

  // 3. Broad Phase - Find potentially colliding pairs
  const pairs = world.broadPhase.getPairs(world.bodies);

  // 4. Narrow Phase + Collision Response
  for (const [indexA, indexB] of pairs) {
    const bodyA = world.bodies[indexA];
    const bodyB = world.bodies[indexB];

    // Type guard - should never happen
    if (!bodyA || !bodyB) continue;

    // Narrow phase - precise collision detection
    // Currently only supports circle-circle
    const contact = detectCircleCircle(bodyA, bodyB);

    // If collision detected, resolve it
    if (contact) {
      world.resolver.resolve(bodyA, bodyB, contact);
    }
  }

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

