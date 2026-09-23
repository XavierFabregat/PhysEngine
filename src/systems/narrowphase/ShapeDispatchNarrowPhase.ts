import type { NarrowPhase } from '../../types/NarrowPhase.js';
import type { Body } from '../../types/Body.js';
import type { Contact } from '../../types/Contact.js';
import type { Shape } from '../../types/Shape.js';
import { detectCircleCircle } from './circleCircle.js';
import { detectCircleRectangle } from './circleRectangle.js';

/**
 * A shape-pair collision test. Receives the bodies in the order it was
 * registered for and returns a contact whose normal points from A to B.
 */
export type ShapeDetector = (bodyA: Body, bodyB: Body) => Contact | null;

type ShapeType = Shape['type'];

/**
 * Narrow phase that dispatches to a detector based on the two shape types.
 *
 * Each shape pair is registered once, in one order (e.g. circle → rectangle).
 * When bodies arrive in the other order, the detector is called with them
 * swapped and the contact normal is flipped, so callers always get a normal
 * pointing from their bodyA to their bodyB.
 *
 * Unsupported pairs return null (no collision).
 *
 * Supported by default:
 * - circle / circle
 * - circle / rectangle
 *
 * @example
 * const narrowPhase = new ShapeDispatchNarrowPhase();
 * narrowPhase.register('rectangle', 'rectangle', detectRectangleRectangle);
 * const world = createWorld({ narrowPhase });
 */
export class ShapeDispatchNarrowPhase implements NarrowPhase {
  private readonly detectors = new Map<string, ShapeDetector>();

  constructor() {
    this.register('circle', 'circle', detectCircleCircle);
    this.register('circle', 'rectangle', detectCircleRectangle);
  }

  /**
   * Registers (or replaces) the detector for a shape pair.
   *
   * @param typeA - Shape type the detector expects as its first body
   * @param typeB - Shape type the detector expects as its second body
   * @param detector - The collision test
   */
  register(typeA: ShapeType, typeB: ShapeType, detector: ShapeDetector): void {
    this.detectors.set(`${typeA}|${typeB}`, detector);
  }

  /**
   * Detects collision between two bodies of any registered shape pair.
   *
   * @param bodyA - First body
   * @param bodyB - Second body
   * @returns Contact (normal from bodyA to bodyB), or null if not colliding
   *   or if the shape pair is not supported
   */
  detect(bodyA: Body, bodyB: Body): Contact | null {
    const typeA = bodyA.shape.type;
    const typeB = bodyB.shape.type;

    const direct = this.detectors.get(`${typeA}|${typeB}`);
    if (direct) return direct(bodyA, bodyB);

    const reversed = this.detectors.get(`${typeB}|${typeA}`);
    if (!reversed) return null;

    const contact = reversed(bodyB, bodyA);
    if (!contact) return null;

    return {
      point: contact.point,
      normal: { x: -contact.normal.x, y: -contact.normal.y },
      depth: contact.depth,
    };
  }
}
