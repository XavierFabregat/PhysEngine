import type { World } from '../types/World.js';
import { updateBodyAABB } from '../bodies/aabb.js';
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
 * @throws RangeError if dt is negative or not finite (NaN would silently
 *   corrupt every body's position)
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
  if (!Number.isFinite(dt) || dt < 0) {
    throw new RangeError(`step: dt must be a finite, non-negative number (got ${dt})`);
  }

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
