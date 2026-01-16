import type { World } from '../types/World.js';
import type { Body } from '../types/Body.js';

/**
 * Adds a body to the world.
 * Mutates the world's bodies array for performance.
 * 
 * @param world - The physics world
 * @param body - The body to add
 * @example
 * const ball = createCircle({ radius: 20 });
 * addBody(world, ball);
 */
export const addBody = (world: World, body: Body): void => {
  world.bodies.push(body);
};

/**
 * Removes a body from the world by its ID.
 * Mutates the world's bodies array.
 * 
 * @param world - The physics world
 * @param bodyId - The ID of the body to remove
 * @returns True if body was found and removed, false otherwise
 * @example
 * const removed = removeBody(world, 'body_5');
 * if (removed) {
 *   console.log('Body removed');
 * }
 */
export const removeBody = (world: World, bodyId: string): boolean => {
  const index = world.bodies.findIndex((b) => b.id === bodyId);
  
  if (index === -1) {
    return false;
  }
  
  world.bodies.splice(index, 1);
  return true;
};

/**
 * Finds a body in the world by its ID.
 * 
 * @param world - The physics world
 * @param bodyId - The ID of the body to find
 * @returns The body if found, undefined otherwise
 * @example
 * const body = getBody(world, 'body_0');
 * if (body) {
 *   console.log(body.position);
 * }
 */
export const getBody = (world: World, bodyId: string): Body | undefined => {
  return world.bodies.find((b) => b.id === bodyId);
};

/**
 * Gets all bodies in the world.
 * Returns a reference to the internal array (not a copy).
 * 
 * @param world - The physics world
 * @returns Array of all bodies
 * @example
 * const bodies = getBodies(world);
 * for (const body of bodies) {
 *   console.log(body.position);
 * }
 */
export const getBodies = (world: World): Body[] => {
  return world.bodies;
};

/**
 * Gets the number of bodies in the world.
 * 
 * @param world - The physics world
 * @returns The count of bodies
 * @example
 * console.log(`World has ${getBodyCount(world)} bodies`);
 */
export const getBodyCount = (world: World): number => {
  return world.bodies.length;
};

/**
 * Removes all bodies from the world.
 * Mutates the world's bodies array.
 * 
 * @param world - The physics world
 * @example
 * clear(world);
 * console.log(getBodyCount(world)); // 0
 */
export const clear = (world: World): void => {
  world.bodies.length = 0;
};

/**
 * Checks if a body with the given ID exists in the world.
 * 
 * @param world - The physics world
 * @param bodyId - The ID to check
 * @returns True if body exists
 * @example
 * if (hasBody(world, 'body_5')) {
 *   console.log('Body exists');
 * }
 */
export const hasBody = (world: World, bodyId: string): boolean => {
  return world.bodies.some((b) => b.id === bodyId);
};

