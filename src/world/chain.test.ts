import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from './createWorld';
import { step } from './step';
import { addBody } from './body';
import { createChain } from '../bodies/createChain';
import { createCircle, resetBodyIdCounter } from '../bodies/createCircle';
import { createRectangle } from '../bodies/createRectangle';
import { raycast } from '../queries/raycast';
import { queryPoint } from '../queries/queryPoint';
import { queryAABB } from '../queries/queryAABB';
import { BodyType } from '../types/BodyType';
import type { Body } from '../types/Body';

/** A finely sampled downhill stroke, like Ramp Sketch draws (14 px apart, ~1.3° per joint). */
const stroke = () => {
  const points: { x: number; y: number }[] = [];
  for (let a = -2.6; a <= -1.7; a += 14 / 600) points.push({ x: 480 + Math.cos(a) * 600, y: -150 - Math.sin(a) * 600 });
  return points;
};
const restingOn = (points: { x: number; y: number }[], along: number, lift: number) => {
  const [a, b] = points as [{ x: number; y: number }, { x: number; y: number }];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const t = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
  return { x: a.x + t.x * along + t.y * lift, y: a.y + t.y * along - t.x * lift };
};
/** Slides a frictionless box down the stroke; counts steps it spends airborne. */
const airborneSteps = (buildGround: (world: ReturnType<typeof createWorld>, points: { x: number; y: number }[]) => void, lift: number) => {
  resetBodyIdCounter();
  const world = createWorld();
  const points = stroke();
  buildGround(world, points);
  const box = createRectangle({
    position: restingOn(points, 14, lift),
    width: 24,
    height: 24,
    rotation: Math.atan2(points[1]!.y - points[0]!.y, points[1]!.x - points[0]!.x),
    material: { friction: 0, restitution: 0 },
  });
  addBody(world, box);
  const endX = points[points.length - 1]!.x - 20;
  let airborne = 0;
  for (let i = 0; i < 300 && box.position.x < endX; i++) {
    step(world, 1 / 60);
    if (i > 3 && !world.contacts.some((c) => c.bodyA === box || c.bodyB === box)) airborne++;
  }
  return airborne;
};

describe('chain bodies in the world', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  it('should let a ball roll down a drawn stroke without leaving it', () => {
    const world = createWorld();
    const points = stroke();
    addBody(world, createChain({ points, material: { friction: 0.5 } }));
    const ball = createCircle({ position: restingOn(points, 8, 13), radius: 13, material: { friction: 0.5, restitution: 0.2 } });
    addBody(world, ball);

    let airborne = 0;
    let previousSpeed = 0;
    let drops = 0;
    const endX = points[points.length - 1]!.x - 15;
    for (let i = 0; i < 300 && ball.position.x < endX; i++) {
      step(world, 1 / 60);
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      if (i > 3 && !world.contacts.some((c) => c.bodyA === ball || c.bodyB === ball)) airborne++;
      if (i > 3 && speed < previousSpeed - 2) drops++; // downhill the whole way: speed never falls
      previousSpeed = speed;
    }
    expect(ball.position.x).toBeGreaterThan(endX - 1); // made it to the end
    expect(airborne).toBe(0);
    expect(drops).toBe(0);
  });

  it('should let a box slide across joints that make a row of boxes hop', () => {
    const asChain = airborneSteps((world, points) => addBody(world, createChain({ points, material: { friction: 0 } })), 12);
    const asBoxes = airborneSteps((world, points) => {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!;
        const b = points[i]!;
        addBody(world, createRectangle({
          position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          width: Math.hypot(b.x - a.x, b.y - a.y) + 8,
          height: 8,
          rotation: Math.atan2(b.y - a.y, b.x - a.x),
          type: BodyType.STATIC,
          material: { friction: 0 },
        }));
      }
    }, 16);

    expect(asChain).toBe(0);
    expect(asBoxes).toBeGreaterThan(10); // measured: 40 steps airborne
  });

  it('should carry a ball on a rotating kinematic chain', () => {
    const world = createWorld({ gravity: { x: 0, y: 0 } });
    const paddle = createChain({ position: { x: 0, y: 0 }, points: [{ x: -100, y: 0 }, { x: 100, y: 0 }], type: BodyType.KINEMATIC, angularVelocity: 2 });
    const ball = createCircle({ position: { x: 60, y: 11 }, radius: 10, material: { restitution: 0 } });
    addBody(world, paddle);
    addBody(world, ball);

    for (let i = 0; i < 10; i++) step(world, 1 / 60);

    // The paddle sweeps +x toward +y, so it pushes the ball down the screen
    expect(ball.velocity.y).toBeGreaterThan(50);
  });

  it('should be hit by raycasts, with the normal facing the ray', () => {
    const world = createWorld();
    const chain = createChain({ points: [{ x: 0, y: 100 }, { x: 100, y: 100 }, { x: 200, y: 50 }] });
    addBody(world, chain);

    const down = raycast(world, { origin: { x: 50, y: 0 }, direction: { x: 0, y: 1 } })!;
    expect(down.body).toBe(chain);
    expect(down.distance).toBeCloseTo(100, 10);
    expect(down.normal.y).toBeCloseTo(-1, 10);
    const up = raycast(world, { origin: { x: 50, y: 300 }, direction: { x: 0, y: -1 } })!;
    expect(up.normal.y).toBeCloseTo(1, 10); // two-sided
    expect(raycast(world, { origin: { x: 300, y: 0 }, direction: { x: 0, y: 1 } })).toBeNull();
  });

  it('should stop bullets at a zero-thickness chain', () => {
    const shoot = (isBullet: boolean) => {
      resetBodyIdCounter();
      const world = createWorld({ gravity: { x: 0, y: 0 } });
      addBody(world, createChain({ points: [{ x: 0, y: -200 }, { x: 0, y: 200 }] }));
      // 50 px per step from -325: -25 then +25, never within 3 px of the line
      const bullet = createCircle({ position: { x: -325, y: 0 }, radius: 3, velocity: { x: 3000, y: 0 }, isBullet });
      addBody(world, bullet);
      for (let i = 0; i < 20; i++) step(world, 1 / 60);
      return bullet.position.x;
    };
    expect(shoot(false)).toBeGreaterThan(0); // passes straight through a line
    expect(shoot(true)).toBeLessThan(0);
  });

  it('should be found by queryAABB but never contain a point', () => {
    const world = createWorld();
    const chain = createChain({ points: [{ x: 0, y: 100 }, { x: 200, y: 100 }] });
    addBody(world, chain);

    expect(queryAABB(world, { min: { x: 90, y: 90 }, max: { x: 110, y: 110 } })).toEqual([chain]);
    expect(queryAABB(world, { min: { x: 90, y: 0 }, max: { x: 110, y: 50 } })).toEqual([]);
    expect(queryPoint(world, { x: 100, y: 100 })).toEqual([] as Body[]);
  });
});
