import type { Vector2 } from '../core/Vector2.js';

/**
 * Library-agnostic interface for debug visualization.
 * 
 * Implement this interface for your rendering library (Canvas, SVG, WebGL, etc.)
 * to visualize physics simulation for debugging and development.
 */
export interface DebugRenderer {
  /**
   * Draws a circle outline.
   * @param x - Center x coordinate
   * @param y - Center y coordinate
   * @param radius - Circle radius
   * @param color - CSS color string (e.g., '#ff0000', 'red', 'rgba(255,0,0,0.5)')
   */
  drawCircle(x: number, y: number, radius: number, color: string): void;

  /**
   * Draws a rectangle outline.
   * The rectangle may be rotated around its center.
   * @param x - Center x coordinate
   * @param y - Center y coordinate
   * @param width - Rectangle width
   * @param height - Rectangle height
   * @param rotation - Rotation angle in radians
   * @param color - CSS color string
   */
  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    color: string
  ): void;

  /**
   * Draws a polygon outline from vertices.
   * @param vertices - Array of vertices in world space
   * @param color - CSS color string
   */
  drawPolygon(vertices: readonly Vector2[], color: string): void;

  /**
   * Draws a line from start to end.
   * @param start - Start position
   * @param end - End position
   * @param color - CSS color string
   */
  drawLine(start: Vector2, end: Vector2, color: string): void;

  /**
   * Draws a point/dot at the given position.
   * @param position - Point position
   * @param color - CSS color string
   */
  drawPoint(position: Vector2, color: string): void;

  /**
   * Clears the entire rendering surface.
   * Called before each frame when using debugDraw in an animation loop.
   */
  clear(): void;
}

/**
 * Options for debug visualization.
 * Controls what elements are rendered by debugDraw.
 */
export interface DebugDrawOptions {
  /** Draw body shapes (default: true) */
  showBodies?: boolean;

  /** Draw axis-aligned bounding boxes (default: false) */
  showAABBs?: boolean;

  /** Draw velocity vectors (default: false) */
  showVelocities?: boolean;

  /** Draw center of mass markers (default: false) */
  showCenterOfMass?: boolean;

  /** Draw body IDs as text (default: false) */
  showIds?: boolean;
}

