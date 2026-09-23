import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from './createWorld';
import { step } from './step';
import { addBody } from './body';
import { onCollisionStart, onCollisionActive } from './events';
import { createCircle, resetBodyIdCounter } from '../bodies/createCircle';
import { createRectangle } from '../bodies/createRectangle';
import { BodyType } from '../types/BodyType';
import type { Contact } from '../types/Contact';
import type { Body } from '../types/Body';

const run = (world: ReturnType<typeof createWorld>, steps: number) => {
  for (let i = 0; i < steps; i++) step(world, 1 / 60);
};

describe('contact impact speed and impulses', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  it('should report a normal impulse equal to the momentum change against a wall', () => {
    const world = createWorld({ gravity: { x: 0, y: 0 } });
    const wall = createRectangle({ position: { x: 100, y: 0 }, width: 20, height: 200, type: BodyType.STATIC, material: { friction: 0 } });
    const ball = createCircle({ radius: 10, velocity: { x: 240, y: 0 }, material: { restitution: 0.5, friction: 0 } });
    addBody(world, wall);
    addBody(world, ball);
    let hit: Contact | null = null;
    let vBefore = 0;
    onCollisionStart(world, (_a, _b, contact) => (hit = contact));

    for (let i = 0; i < 60 && !hit; i++) {
      vBefore = ball.velocity.x;
      step(world, 1 / 60);
    }

    expect(hit).not.toBeNull();
    const momentumChange = ball.mass * Math.abs(ball.velocity.x - vBefore);
    expect(hit!.normalImpulse!).toBeCloseTo(momentumChange, 6);
    expect(hit!.impactSpeed!).toBeCloseTo(240, 6);
    // Restitution combines by min: the wall's default 0.2 wins over the ball's 0.5
    expect(ball.velocity.x).toBeCloseTo(-0.2 * 240, 6);
  });

  it('should transfer equal and opposite momentum between two moving bodies', () => {
    const world = createWorld({ gravity: { x: 0, y: 0 } });
    const a = createCircle({ position: { x: 0, y: 0 }, radius: 10, velocity: { x: 150, y: 0 }, material: { friction: 0 } });
    const b = createCircle({ position: { x: 40, y: 0 }, radius: 14, velocity: { x: -60, y: 0 }, material: { friction: 0 } });
    addBody(world, a);
    addBody(world, b);
    let hit: { contact: Contact; bodyB: Body } | null = null;
    let before = { a: 0, b: 0 };
    onCollisionStart(world, (_bodyA, bodyB, contact) => (hit = { contact, bodyB }));

    for (let i = 0; i < 60 && !hit; i++) {
      before = { a: a.velocity.x, b: b.velocity.x };
      step(world, 1 / 60);
    }

    const dpA = a.mass * (a.velocity.x - before.a);
    const dpB = b.mass * (b.velocity.x - before.b);
    expect(dpA).toBeCloseTo(-dpB, 6); // momentum conserved
    expect(hit!.contact.normalImpulse!).toBeCloseTo(Math.abs(dpB), 6);
    expect(hit!.contact.impactSpeed!).toBeCloseTo(210, 6); // closing speed 150 + 60
  });

  it('should give a resting box a normal impulse of its weight × dt and ~0 impact speed', () => {
    const world = createWorld();
    addBody(world, createRectangle({ position: { x: 0, y: 580 }, width: 400, height: 40, type: BodyType.STATIC }));
    const crate = createRectangle({ position: { x: 0, y: 540 }, width: 40, height: 40, material: { restitution: 0 } });
    addBody(world, crate);
    let last: Contact | null = null;
    onCollisionActive(world, (_a, _b, contact) => (last = contact));

    run(world, 120);

    const weightImpulse = crate.mass * 400 * (1 / 60);
    expect(last!.normalImpulse!).toBeCloseTo(weightImpulse, 4);
    expect(last!.impactSpeed!).toBeLessThan(0.01);
  });

  it('should report a friction impulse of μ × normal impulse while sliding', () => {
    const world = createWorld();
    addBody(world, createRectangle({ position: { x: 0, y: 580 }, width: 4000, height: 40, type: BodyType.STATIC, material: { friction: 0.5 } }));
    const crate = createRectangle({ position: { x: 0, y: 540 }, width: 40, height: 40, velocity: { x: 300, y: 0 }, material: { restitution: 0, friction: 0.5 } });
    addBody(world, crate);
    const samples: Contact[] = [];
    onCollisionActive(world, (_a, _b, contact) => samples.push(contact));

    run(world, 20); // still sliding (stops after ~1.5 s)

    const last = samples[samples.length - 1]!;
    expect(Math.abs(last.tangentImpulse!)).toBeCloseTo(0.5 * last.normalImpulse!, 4);
  });

  it('should measure impact speed ≈ √(2gh) for a dropped ball', () => {
    const world = createWorld({ gravity: { x: 0, y: 400 } });
    addBody(world, createRectangle({ position: { x: 0, y: 580 }, width: 400, height: 40, type: BodyType.STATIC }));
    addBody(world, createCircle({ position: { x: 0, y: 340 }, radius: 20 })); // falls 200 px to the floor
    let impact = 0;
    // First impact only: the ball bounces and starts new, slower contacts
    onCollisionStart(world, (_a, _b, contact) => {
      if (impact === 0) impact = contact.impactSpeed!;
    });

    run(world, 120);

    const expected = Math.sqrt(2 * 400 * 200); // 400 px/s
    expect(impact).toBeGreaterThan(expected * 0.98);
    expect(impact).toBeLessThan(expected * 1.04);
  });

  it('should set impact speed for sensors, with zero impulses', () => {
    const world = createWorld({ gravity: { x: 0, y: 0 } });
    addBody(world, createRectangle({ position: { x: 60, y: 0 }, width: 20, height: 20, type: BodyType.STATIC, isSensor: true }));
    addBody(world, createCircle({ radius: 5, velocity: { x: 90, y: 0 } }));
    let hit: Contact | null = null;
    onCollisionStart(world, (_a, _b, contact) => (hit = contact));

    run(world, 60);

    expect(hit!.impactSpeed!).toBeCloseTo(90, 6);
    expect(hit!.normalImpulse).toBe(0);
    expect(hit!.tangentImpulse).toBe(0);
  });

  it('should set impact speed even with a custom resolver', () => {
    const world = createWorld({ gravity: { x: 0, y: 0 }, resolver: { resolve: () => {} } });
    addBody(world, createCircle({ radius: 10, velocity: { x: 50, y: 0 } }));
    addBody(world, createCircle({ position: { x: 25, y: 0 }, radius: 10 }));
    let impact: number | undefined;
    onCollisionStart(world, (_a, _b, contact) => (impact = contact.impactSpeed));

    run(world, 30);

    expect(impact).toBeCloseTo(50, 6);
  });
});
