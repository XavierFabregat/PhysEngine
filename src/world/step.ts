import type { World } from '../types/World.js';
import type { ContactPair } from '../types/Contact.js';
import { updateBodyAABB } from '../bodies/aabb.js';
import { dispatchCollisionEvents } from './events.js';

/**
 * Advances the physics simulation by one time step.
 * 
 * This is the main simulation loop function. Call this every frame
 * to update the physics world.
 * 
 * Physics pipeline (Box2D's order):
 * 1. Integrate velocities - gravity and forces change velocities only
 * 2. AABB update + broad phase - potentially colliding pairs
 * 3. Narrow phase - contacts at the current positions
 * 4. Solve velocities - impulses for all contacts together, so bodies stop
 *    *before* they move into each other (no creep on slopes, no sinking stacks)
 * 5. Integrate positions - move bodies with the corrected velocities
 * 6. Correct positions - push apart any remaining overlap
 * 7. AABB update - bounding boxes match the final positions
 * 8. Time increment
 * 9. Collision events - start/active/end handlers, after the step is complete
 *    (so they may add or remove bodies)
 *
 * Custom systems without the split methods keep working: an integrator with
 * only `integrate()` runs first (old order), and a resolver with only
 * `resolve()` is called once per contact in step 4.
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

  const { integrator, resolver } = world;
  const splitIntegrator = Boolean(integrator.integrateVelocity && integrator.integratePosition);

  // 1. Integrate velocities (or, for legacy integrators, the whole motion)
  for (const body of world.bodies) {
    if (splitIntegrator) integrator.integrateVelocity!(body, dt, world.gravity);
    else integrator.integrate(body, dt, world.gravity);
  }

  // 2. Broad phase on up-to-date AABBs (bodies may have been moved by the user)
  for (const body of world.bodies) {
    updateBodyAABB(body);
  }
  const pairs = world.broadPhase.getPairs(world.bodies);

  // 3. Narrow phase - precise contacts (dispatches on shape pair)
  const contacts: ContactPair[] = [];
  for (const [indexA, indexB] of pairs) {
    const bodyA = world.bodies[indexA];
    const bodyB = world.bodies[indexB];
    if (!bodyA || !bodyB) continue;

    const contact = world.narrowPhase.detect(bodyA, bodyB);
    if (contact) contacts.push({ bodyA, bodyB, contact });
  }

  // 4. Collision response, velocity phase
  const batchResolver = Boolean(resolver.solveVelocities && resolver.correctPositions);
  if (batchResolver) {
    resolver.solveVelocities!(contacts, dt, world.gravity);
  } else {
    for (const { bodyA, bodyB, contact } of contacts) resolver.resolve(bodyA, bodyB, contact);
  }

  // 5. Integrate positions with the contact-corrected velocities
  if (splitIntegrator) {
    for (const body of world.bodies) integrator.integratePosition!(body, dt);
  }

  // 6. Position phase: push apart remaining overlap
  if (batchResolver) resolver.correctPositions!(contacts);

  // 7. AABBs match the final positions (for queries, rendering, next step)
  for (const body of world.bodies) {
    updateBodyAABB(body);
  }

  // 8. Increment simulation time
  world.time += dt;

  // 9. Collision events (last, so handlers see the finished step)
  world.contacts = contacts;
  dispatchCollisionEvents(world, contacts);
};
