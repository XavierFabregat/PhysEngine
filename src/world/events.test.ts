import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from './createWorld';
import { step } from './step';
import { addBody, removeBody } from './body';
import { onCollisionStart, onCollisionActive, onCollisionEnd } from './events';
import { createCircle, resetBodyIdCounter } from '../bodies/createCircle';
import { createRectangle } from '../bodies/createRectangle';
import { BodyType } from '../types/BodyType';
import type { Body } from '../types/Body';

const floor = () =>
  createRectangle({ position: { x: 0, y: 580 }, width: 800, height: 40, type: BodyType.STATIC });

/** World with a floor and a ball resting just above it. */
const restingScene = () => {
  const world = createWorld();
  const ground = floor();
  // Floor top is y = 560: start the ball 0.5 px into it so it touches from step 1
  const ball = createCircle({ position: { x: 0, y: 540.5 }, radius: 20, material: { restitution: 0 } });
  addBody(world, ground);
  addBody(world, ball);
  return { world, ground, ball };
};

const run = (world: ReturnType<typeof createWorld>, steps: number) => {
  for (let i = 0; i < steps; i++) step(world, 1 / 60);
};

describe('collision events', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  it('should fire start once, then active every step while touching', () => {
    const { world, ball, ground } = restingScene();
    const starts: string[] = [];
    let actives = 0;
    onCollisionStart(world, (a, b) => starts.push(`${a.id}|${b.id}`));
    onCollisionActive(world, () => actives++);

    run(world, 10);

    expect(starts).toEqual([`${ground.id}|${ball.id}`]);
    // Touching from the first step on: start on step 1, active on steps 2-10
    expect(actives).toBe(9);
  });

  it('should pass bodies in contact-normal order with the contact', () => {
    const { world, ground, ball } = restingScene();
    const seen: { a: Body; b: Body; normalY: number }[] = [];
    onCollisionStart(world, (a, b, contact) => seen.push({ a, b, normalY: contact.normal.y }));

    run(world, 1);

    // Floor was added first, so it is bodyA; the normal points A → B,
    // i.e. from the floor up to the ball (-y on a y-down screen)
    expect(seen).toHaveLength(1);
    expect(seen[0]!.a).toBe(ground);
    expect(seen[0]!.b).toBe(ball);
    expect(seen[0]!.normalY).toBeCloseTo(-1, 6);
  });

  it('should fire end when the bodies separate', () => {
    const world = createWorld({ gravity: { x: 0, y: 0 } });
    const a = createCircle({ position: { x: 0, y: 0 }, radius: 10, velocity: { x: 60, y: 0 }, material: { restitution: 1 } });
    const b = createCircle({ position: { x: 25, y: 0 }, radius: 10, material: { restitution: 1 } });
    addBody(world, a);
    addBody(world, b);
    const log: string[] = [];
    onCollisionStart(world, () => log.push(`start@${world.time.toFixed(3)}`));
    onCollisionEnd(world, () => log.push(`end@${world.time.toFixed(3)}`));

    run(world, 60);

    expect(log).toHaveLength(2);
    expect(log[0]).toMatch(/^start/);
    expect(log[1]).toMatch(/^end/);
  });

  it('should stop calling a handler after unsubscribing', () => {
    const { world } = restingScene();
    let calls = 0;
    const off = onCollisionActive(world, () => calls++);

    run(world, 3);
    off();
    run(world, 3);

    expect(calls).toBe(2);
  });

  it('should tolerate handlers unsubscribing themselves during dispatch', () => {
    const { world } = restingScene();
    let first = 0;
    let second = 0;
    const offFirst = onCollisionActive(world, () => {
      first++;
      offFirst();
    });
    onCollisionActive(world, () => second++);

    run(world, 4);

    expect(first).toBe(1);
    expect(second).toBe(3);
  });

  it('should fire for sensors without deflecting the body passing through', () => {
    const world = createWorld({ gravity: { x: 0, y: 0 } });
    const zone = createRectangle({ position: { x: 100, y: 0 }, width: 40, height: 40, type: BodyType.STATIC, isSensor: true });
    const ball = createCircle({ position: { x: 0, y: 0 }, radius: 5, velocity: { x: 120, y: 0 } });
    addBody(world, zone);
    addBody(world, ball);
    const log: string[] = [];
    onCollisionStart(world, () => log.push('enter'));
    onCollisionEnd(world, () => log.push('exit'));

    run(world, 120);

    expect(log).toEqual(['enter', 'exit']);
    expect(ball.velocity).toEqual({ x: 120, y: 0 });
  });

  it('should not fire for pairs excluded by collision layers', () => {
    const world = createWorld();
    addBody(world, createRectangle({ position: { x: 0, y: 580 }, width: 800, height: 40, type: BodyType.STATIC, layer: 1, collidesWith: 1 }));
    addBody(world, createCircle({ position: { x: 0, y: 540.5 }, radius: 20, layer: 2, collidesWith: 2 }));
    let events = 0;
    onCollisionStart(world, () => events++);

    run(world, 10);

    expect(events).toBe(0);
  });

  it('should fire end on the step after a touching body is removed', () => {
    const { world, ball } = restingScene();
    const ended: string[] = [];
    onCollisionEnd(world, (a, b) => ended.push(a.id === ball.id || b.id === ball.id ? 'ball' : 'other'));

    run(world, 3);
    removeBody(world, ball.id);
    run(world, 1);

    expect(ended).toEqual(['ball']);
  });

  it('should let handlers add and remove bodies safely', () => {
    const { world, ball } = restingScene();
    onCollisionStart(world, () => {
      removeBody(world, ball.id);
      addBody(world, createCircle({ position: { x: 300, y: 100 }, radius: 5 }));
    });

    expect(() => run(world, 5)).not.toThrow();
    expect(world.bodies.some((b) => b.id === ball.id)).toBe(false);
    expect(world.bodies).toHaveLength(2);
  });

  it('should expose the step contacts on world.contacts', () => {
    const { world, ball } = restingScene();
    expect(world.contacts).toEqual([]);

    run(world, 1);

    expect(world.contacts).toHaveLength(1);
    const [pair] = world.contacts;
    expect([pair!.bodyA.id, pair!.bodyB.id]).toContain(ball.id);
    expect(pair!.contact.depth).toBeGreaterThanOrEqual(0);
  });

  it('should keep events separate between worlds', () => {
    const one = restingScene();
    resetBodyIdCounter();
    const two = restingScene();
    let fromOne = 0;
    onCollisionStart(one.world, () => fromOne++);

    run(two.world, 5);
    expect(fromOne).toBe(0);
    run(one.world, 1);
    expect(fromOne).toBe(1);
  });
});
