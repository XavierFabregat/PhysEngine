/// <reference lib="dom" />

import type { Vector2 } from '../../core/Vector2.js';
import type { DebugRenderer } from '../DebugRenderer.js';

/**
 * Canvas 2D implementation of DebugRenderer.
 * 
 * This is a reference implementation that users can copy and customize.
 * Renders physics bodies using the HTML5 Canvas 2D API.
 * 
 * NOTE: This file is meant for browser environments only.
 * It uses DOM types (HTMLCanvasElement, CanvasRenderingContext2D).
 * 
 * @example
 * const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
 * const renderer = new CanvasRenderer(canvas);
 * debugDraw(world, renderer, { showAABBs: true });
 */
export class CanvasRenderer implements DebugRenderer {
  private ctx: CanvasRenderingContext2D;

  /**
   * Creates a new Canvas renderer.
   * @param canvas - The HTML canvas element to render to
   * @throws Error if canvas context cannot be obtained
   */
  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    this.ctx = ctx;
  }

  /**
   * Clears the entire canvas.
   */
  clear(): void {
    const { width, height } = this.ctx.canvas;
    this.ctx.clearRect(0, 0, width, height);
  }

  /**
   * Draws a circle outline.
   */
  drawCircle(x: number, y: number, radius: number, color: string): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  /**
   * Draws a rectangle outline with optional rotation.
   */
  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    color: string
  ): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-width / 2, -height / 2, width, height);
    this.ctx.restore();
  }

  /**
   * Draws a polygon outline from vertices.
   */
  drawPolygon(vertices: readonly Vector2[], color: string): void {
    if (vertices.length < 2) return;

    const first = vertices[0];
    if (!first) return;

    this.ctx.beginPath();
    this.ctx.moveTo(first.x, first.y);

    for (let i = 1; i < vertices.length; i++) {
      const vertex = vertices[i];
      if (vertex) {
        this.ctx.lineTo(vertex.x, vertex.y);
      }
    }

    this.ctx.closePath();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  /**
   * Draws a line from start to end.
   */
  drawLine(start: Vector2, end: Vector2, color: string): void {
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  /**
   * Draws a point/dot.
   */
  drawPoint(position: Vector2, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(position.x - 3, position.y - 3, 6, 6);
  }
}

