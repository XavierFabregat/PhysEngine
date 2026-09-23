import { describe, it, expect, beforeEach } from 'vitest';
import { createChain } from './createChain';
import { resetBodyIdCounter } from './idGenerator';
import { BodyType } from '../types/BodyType';

const zigzag = [{ x: 0, y: 0 }, { x: 50, y: 20 }, { x: 100, y: 0 }];

describe('createChain', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  it('should create a static, massless polyline with an AABB around its points', () => {
    const chain = createChain({ position: { x: 10, y: 5 }, points: zigzag });

    expect(chain.type).toBe('static');
    expect(chain.shape).toEqual({ type: 'chain', vertices: zigzag, loop: false });
    expect(chain.mass).toBe(Infinity);
    expect(chain.invMass).toBe(0);
    expect(chain.invInertia).toBe(0);
    expect(chain.aabb).toEqual({ min: { x: 10, y: 5 }, max: { x: 110, y: 25 } });
  });

  it('should allow kinematic chains and loops', () => {
    const chain = createChain({ points: zigzag, loop: true, type: BodyType.KINEMATIC, angularVelocity: 1 });
    expect(chain.type).toBe('kinematic');
    expect(chain.shape.type === 'chain' && chain.shape.loop).toBe(true);
  });

  it('should not alias the caller points', () => {
    const points = zigzag.map((p) => ({ ...p }));
    const chain = createChain({ points });
    points[0]!.x = 999;
    expect(chain.shape.type === 'chain' && chain.shape.vertices[0]!.x).toBe(0);
  });

  it('should reject dynamic chains and bad point lists', () => {
    expect(() => createChain({ points: zigzag, type: 'dynamic' as never })).toThrow(/static or kinematic/);
    expect(() => createChain({ points: [{ x: 0, y: 0 }] })).toThrow(/at least 2/);
    expect(() => createChain({ points: zigzag.slice(0, 2), loop: true })).toThrow(/at least 3/);
    expect(() => createChain({ points: [{ x: 0, y: 0 }, { x: NaN, y: 1 }] })).toThrow(/finite/);
    expect(() => createChain({ points: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 5 }] })).toThrow(/same/);
  });
});
