/**
 * PhysEngine - 2D Physics Engine
 * 
 * A 2D physics engine for games and simulations.
 */

// ============================================================
// CORE MATH MODULES
// ============================================================

export * as Vector2 from './core/Vector2.js';
export * as Transform from './core/Transform.js';
export * as AABB from './core/AABB.js';
export * as math from './core/math.js';

// ============================================================
// TYPES
// ============================================================

// Core types
export type { Vector2 as Vector2Type } from './core/Vector2.js';
export type { Transform as TransformType } from './core/Transform.js';
export type { AABB as AABBType } from './core/AABB.js';

// Body types
export type { Body } from './types/Body.js';
export type { BodyType as BodyTypeEnum } from './types/BodyType.js';
export type { Material } from './types/Material.js';
export type { Shape, CircleShape, RectangleShape, PolygonShape, ChainShape } from './types/Shape.js';
export type { World } from './types/World.js';
export type { Integrator } from './types/Integrator.js';
export type { BroadPhase, BodyPair } from './types/BroadPhase.js';
export type { NarrowPhase } from './types/NarrowPhase.js';
export type { CollisionResolver } from './types/CollisionResolver.js';
export type { Contact, ContactPair } from './types/Contact.js';

// Body type constants (exported as value)
export { BodyType } from './types/BodyType.js';

// ============================================================
// BODY FACTORIES
// ============================================================

export { createCircle } from './bodies/createCircle.js';
export type { CircleConfig } from './bodies/createCircle.js';

export { createRectangle } from './bodies/createRectangle.js';
export type { RectangleConfig } from './bodies/createRectangle.js';

export { createPolygon } from './bodies/createPolygon.js';
export type { PolygonConfig } from './bodies/createPolygon.js';

export { createChain } from './bodies/createChain.js';
export type { ChainConfig } from './bodies/createChain.js';

export { computeShapeAABB, updateBodyAABB } from './bodies/aabb.js';

export { applyForce, applyImpulse, applyTorque } from './bodies/forces.js';

// ============================================================
// WORLD
// ============================================================

export { createWorld } from './world/createWorld.js';
export type { WorldConfig } from './world/createWorld.js';

export {
  addBody,
  removeBody,
  getBody,
  getBodies,
  getBodyCount,
  clear,
  hasBody,
} from './world/body.js';

export { step } from './world/step.js';
export { onCollisionStart, onCollisionActive, onCollisionEnd } from './world/events.js';

// ============================================================
// WORLD QUERIES
// ============================================================

export { raycast } from './queries/raycast.js';
export { queryPoint, bodyContainsPoint } from './queries/queryPoint.js';
export { queryAABB } from './queries/queryAABB.js';
export type { QueryFilter, RaycastOptions, RaycastHit } from './types/Query.js';
export type { CollisionHandler, CollisionEndHandler, Unsubscribe, CollisionEvents } from './types/Events.js';

// ============================================================
// INTEGRATORS
// ============================================================

export {
  SemiImplicitEulerIntegrator,
  /** @deprecated Use SemiImplicitEulerIntegrator (it was never Verlet). */
  VerletIntegrator,
} from './systems/integrators/SemiImplicitEuler.js';

// ============================================================
// COLLISION DETECTION & RESPONSE
// ============================================================

// Broad phase
export { BruteForceBroadPhase } from './systems/broadphase/BruteForce.js';

// Narrow phase
export { detectCircleCircle } from './systems/narrowphase/circleCircle.js';
export { detectCircleRectangle } from './systems/narrowphase/circleRectangle.js';
export { detectCirclePolygon } from './systems/narrowphase/circlePolygon.js';
export { detectPolygonPolygon } from './systems/narrowphase/polygonPolygon.js';
export { detectCircleChain, detectPolygonChain } from './systems/narrowphase/chain.js';
export { ShapeDispatchNarrowPhase } from './systems/narrowphase/ShapeDispatchNarrowPhase.js';
export type { ShapeDetector } from './systems/narrowphase/ShapeDispatchNarrowPhase.js';

// Resolvers
export { ImpulseResolver } from './systems/resolvers/ImpulseResolver.js';
export type { ImpulseResolverOptions } from './systems/resolvers/ImpulseResolver.js';

// ============================================================
// DEBUG RENDERER
// ============================================================

export type { DebugRenderer, DebugDrawOptions } from './debug/DebugRenderer.js';
export { debugDraw } from './debug/debugDraw.js';

// The Canvas reference renderer depends on DOM types, so it lives at a
// separate entry point to keep this one headless:
//   import { CanvasRenderer } from '@xavifabregat/physengine/canvas';

// ============================================================
// UTILITIES
// ============================================================

// Material utilities
export { createMaterial, DEFAULT_MATERIAL, resolveCombineRule } from './types/Material.js';
export type { CombineRule } from './types/Material.js';

// Shape type guards
export { isCircle, isRectangle, isPolygon, isChain } from './types/Shape.js';

// Body type helpers
export { isStatic, isDynamic, isKinematic, shouldCollide } from './types/Body.js';
