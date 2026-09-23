import { describe, it, expect, beforeEach } from 'vitest';
import { debugDraw } from './debugDraw';
import type { DebugRenderer } from './DebugRenderer';
import { createWorld } from '../world/createWorld';
import { addBody } from '../world/body';
import { createCircle, resetBodyIdCounter } from '../bodies/createCircle';
import { createRectangle } from '../bodies/createRectangle';
import { createChain } from '../bodies/createChain';

type Call = [method: string, ...args: unknown[]];

const createRecorder = (withText = true): DebugRenderer & { calls: Call[] } => {
  const calls: Call[] = [];
  const record = (method: string) => (...args: unknown[]) => {
    calls.push([method, ...args]);
  };
  return {
    calls,
    clear: record('clear'),
    drawCircle: record('drawCircle'),
    drawRect: record('drawRect'),
    drawPolygon: record('drawPolygon'),
    drawLine: record('drawLine'),
    drawPoint: record('drawPoint'),
    ...(withText ? { drawText: record('drawText') } : {}),
  };
};

const methods = (calls: Call[]) => calls.map(([method]) => method);

describe('debugDraw', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  it('should clear, then draw each body shape by default', () => {
    const world = createWorld();
    addBody(world, createCircle({ radius: 5, position: { x: 1, y: 2 } }));
    addBody(world, createRectangle({ width: 4, height: 2, rotation: 0.5 }));
    const renderer = createRecorder();

    debugDraw(world, renderer);

    expect(renderer.calls[0]).toEqual(['clear']);
    expect(renderer.calls[1]).toEqual(['drawCircle', 1, 2, 5, '#4488ff']);
    // Orientation line from the center to the rim (rotation 0 → +x)
    expect(renderer.calls[2]).toEqual(['drawLine', { x: 1, y: 2 }, { x: 6, y: 2 }, '#4488ff']);
    expect(renderer.calls[3]).toEqual(['drawRect', 0, 0, 4, 2, 0.5, '#4488ff']);
    expect(renderer.calls).toHaveLength(4);
  });

  it('should rotate the circle orientation line with the body', () => {
    const world = createWorld();
    addBody(world, createCircle({ radius: 10, rotation: Math.PI / 2 }));
    const renderer = createRecorder();

    debugDraw(world, renderer);

    const [, start, end] = renderer.calls.find(([m]) => m === 'drawLine')! as [string, { x: number; y: number }, { x: number; y: number }];
    expect(start).toEqual({ x: 0, y: 0 });
    expect(end.x).toBeCloseTo(0, 10);
    expect(end.y).toBeCloseTo(10, 10); // +x rotated toward +y
  });

  it('should draw body IDs when showIds is enabled', () => {
    const world = createWorld();
    const body = createCircle({ radius: 5, position: { x: 3, y: 4 } });
    addBody(world, body);
    const renderer = createRecorder();

    debugDraw(world, renderer, { showIds: true });

    expect(renderer.calls).toContainEqual(['drawText', { x: 3, y: 4 }, body.id, '#ffffff']);
  });

  it('should skip IDs for renderers without drawText', () => {
    const world = createWorld();
    addBody(world, createCircle({ radius: 5 }));
    const renderer = createRecorder(false);

    expect(() => debugDraw(world, renderer, { showIds: true })).not.toThrow();
    expect(methods(renderer.calls)).toEqual(['clear', 'drawCircle', 'drawLine']);
  });

  it('should draw AABBs, velocity arrows and center of mass when enabled', () => {
    const world = createWorld();
    addBody(world, createCircle({ radius: 5, velocity: { x: 10, y: 0 } }));
    const renderer = createRecorder();

    debugDraw(world, renderer, {
      showBodies: false,
      showAABBs: true,
      showVelocities: true,
      showCenterOfMass: true,
    });

    expect(methods(renderer.calls)).toEqual([
      'clear',
      'drawRect', // AABB
      'drawLine', // velocity shaft
      'drawLine', // arrowhead left
      'drawLine', // arrowhead right
      'drawPoint', // center of mass
    ]);
  });

  it('should draw contact points and normals when showContacts is enabled', () => {
    const world = createWorld();
    world.contacts = [{
      bodyA: createCircle({ radius: 5 }),
      bodyB: createCircle({ radius: 5 }),
      contact: { point: { x: 10, y: 20 }, points: [{ x: 8, y: 20 }, { x: 12, y: 20 }], normal: { x: 0, y: 1 }, depth: 1 },
    }];
    const renderer = createRecorder();

    debugDraw(world, renderer, { showBodies: false, showContacts: true });

    expect(renderer.calls).toEqual([
      ['clear'],
      ['drawLine', { x: 10, y: 20 }, { x: 10, y: 32 }, '#ffff00'],
      ['drawPoint', { x: 8, y: 20 }, '#ffff00'],
      ['drawPoint', { x: 12, y: 20 }, '#ffff00'],
    ]);
  });

  it('should draw a chain as connected lines, closing loops', () => {
    const world = createWorld();
    addBody(world, createChain({ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], loop: true }));
    const renderer = createRecorder();

    debugDraw(world, renderer);

    expect(renderer.calls.filter(([m]) => m === 'drawLine')).toEqual([
      ['drawLine', { x: 0, y: 0 }, { x: 10, y: 0 }, '#888888'],
      ['drawLine', { x: 10, y: 0 }, { x: 10, y: 10 }, '#888888'],
      ['drawLine', { x: 10, y: 10 }, { x: 0, y: 0 }, '#888888'],
    ]);
  });
});
