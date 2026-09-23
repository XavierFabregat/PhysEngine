import type { World } from '../types/World.js';
import type { ContactPair } from '../types/Contact.js';
import type { Body } from '../types/Body.js';
import type {
  CollisionEvents,
  CollisionHandler,
  CollisionEndHandler,
  Unsubscribe,
} from '../types/Events.js';

/**
 * Creates empty collision event state for a new world.
 * @returns Event state with no handlers and no touching pairs
 */
export const createCollisionEvents = (): CollisionEvents => ({
  start: new Set(),
  active: new Set(),
  end: new Set(),
  touching: new Map(),
});

/** Order-independent key for a body pair. */
const pairKey = (a: Body, b: Body): string => (a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`);

/**
 * Calls `handler` whenever two bodies begin touching.
 * Fires once per contact, at the end of the step it started in. Works for
 * sensors too (they detect contacts without responding to them).
 *
 * @param world - The physics world
 * @param handler - Receives both bodies and the contact
 * @returns Function that removes the handler
 * @example
 * const off = onCollisionStart(world, (bodyA, bodyB, contact) => {
 *   console.log('Collision!', bodyA.id, bodyB.id, contact.point);
 * });
 * off(); // stop listening
 */
export const onCollisionStart = (world: World, handler: CollisionHandler): Unsubscribe => {
  world.events.start.add(handler);
  return () => world.events.start.delete(handler);
};

/**
 * Calls `handler` on every step two bodies remain touching (not on the step
 * they start; use onCollisionStart for that).
 *
 * @param world - The physics world
 * @param handler - Receives both bodies and this step's contact
 * @returns Function that removes the handler
 */
export const onCollisionActive = (world: World, handler: CollisionHandler): Unsubscribe => {
  world.events.active.add(handler);
  return () => world.events.active.delete(handler);
};

/**
 * Calls `handler` when two bodies stop touching. Also fires the step after a
 * touching body is removed from the world (the pair has no contact anymore).
 *
 * @param world - The physics world
 * @param handler - Receives both bodies
 * @returns Function that removes the handler
 * @example
 * onCollisionEnd(world, (bodyA, bodyB) => console.log('Separated', bodyA.id, bodyB.id));
 */
export const onCollisionEnd = (world: World, handler: CollisionEndHandler): Unsubscribe => {
  world.events.end.add(handler);
  return () => world.events.end.delete(handler);
};

/**
 * Compares this step's contacts with the last step's and calls the start,
 * active and end handlers. Called by `step()` once the step is complete, so
 * handlers may add or remove bodies safely.
 *
 * @param world - The physics world
 * @param contacts - Contacts found this step
 * @internal
 */
export const dispatchCollisionEvents = (world: World, contacts: readonly ContactPair[]): void => {
  const { events } = world;
  const previous = events.touching;
  const current = new Map<string, { bodyA: Body; bodyB: Body }>();

  const started: ContactPair[] = [];
  const active: ContactPair[] = [];
  for (const pair of contacts) {
    const key = pairKey(pair.bodyA, pair.bodyB);
    if (current.has(key)) continue;
    current.set(key, { bodyA: pair.bodyA, bodyB: pair.bodyB });
    (previous.has(key) ? active : started).push(pair);
  }

  const ended: { bodyA: Body; bodyB: Body }[] = [];
  for (const [key, pair] of previous) {
    if (!current.has(key)) ended.push(pair);
  }

  // Update state before calling handlers, so a handler that steps the world
  // or throws can't make the next dispatch misreport starts and ends
  events.touching = current;

  // Snapshot handler sets: handlers may unsubscribe (or subscribe) while running
  if (events.start.size > 0) {
    const handlers = [...events.start];
    for (const { bodyA, bodyB, contact } of started) for (const h of handlers) h(bodyA, bodyB, contact);
  }
  if (events.active.size > 0) {
    const handlers = [...events.active];
    for (const { bodyA, bodyB, contact } of active) for (const h of handlers) h(bodyA, bodyB, contact);
  }
  if (events.end.size > 0) {
    const handlers = [...events.end];
    for (const { bodyA, bodyB } of ended) for (const h of handlers) h(bodyA, bodyB);
  }
};
