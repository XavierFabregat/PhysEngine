import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from './createWorld';
import { step } from './step';
import { addBody } from './body';
import { onCollisionStart } from './events';
import { createCircle, resetBodyIdCounter } from '../bodies/createCircle';
import { createRectangle } from '../bodies/createRectangle';
import { BodyType } from '../types/BodyType';

const zeroG = () => createWorld({ gravity: { x: 0, y: 0 } });
const run = (world: ReturnType<typeof createWorld>, steps: number) => {
  for (let i = 0; i < steps; i++) step(world, 1 / 60);
};

/** Fires a small fast ball at a thin wall from `offsets` start positions; counts pass-throughs. */
const tunnelingSweep = (isBullet: boolean, speed: number, offsets = 50) => {
  let tunneled = 0;
  for (let k = 0; k < offsets; k++) {
    resetBodyIdCounter();
    const world = zeroG();
    addBody(world, createRectangle({ position: { x: 0, y: 0 }, width: 10, height: 200, type: BodyType.STATIC, material: { restitution: 1 } }));
    const ball = createCircle({
      position: { x: -300 - k * (speed / 60 / offsets), y: 0 },
      radius: 3,
      velocity: { x: speed, y: 0 },
      isBullet,
      material: { restitution: 1 },
    });
    addBody(world, ball);
    run(world, 30);
    if (ball.position.x > 0) tunneled++;
  }
  return tunneled;
};

describe('continuous collision detection (isBullet)', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  it('should stop 3000 px/s bullets from tunneling through a 10 px wall', () => {
    expect(tunnelingSweep(false, 3000)).toBeGreaterThan(40); // most tunnel without CCD
    expect(tunnelingSweep(true, 3000)).toBe(0);
  });

  it('should hold at extreme speed too', () => {
    expect(tunnelingSweep(true, 30000)).toBe(0);
  });

  it('should bounce the bullet and fire a collision with the real impact speed', () => {
    const world = zeroG();
    addBody(world, createRectangle({ position: { x: 0, y: 0 }, width: 10, height: 200, type: BodyType.STATIC, material: { restitution: 1 } }));
    const ball = createCircle({ position: { x: -300, y: 0 }, radius: 3, velocity: { x: 3000, y: 0 }, isBullet: true, material: { restitution: 1 } });
    addBody(world, ball);
    const impacts: number[] = [];
    onCollisionStart(world, (_a, _b, contact) => impacts.push(contact.impactSpeed!));

    run(world, 30);

    expect(impacts).toHaveLength(1);
    expect(impacts[0]).toBeCloseTo(3000, 6);
    expect(ball.velocity.x).toBeCloseTo(-3000, 6);
    expect(ball.position.x).toBeLessThan(-5);
  });

  it('should stop bullets at small circles and rotated thin boxes', () => {
    const world = zeroG();
    const peg = createCircle({ position: { x: 0, y: 0 }, radius: 4, type: BodyType.STATIC, material: { restitution: 1 } });
    const blade = createRectangle({ position: { x: 0, y: 200 }, width: 200, height: 6, rotation: Math.PI / 3, type: BodyType.STATIC, material: { restitution: 1 } });
    addBody(world, peg);
    addBody(world, blade);
    const a = createCircle({ position: { x: -400, y: 0 }, radius: 2, velocity: { x: 4000, y: 0 }, isBullet: true, material: { restitution: 1 } });
    const b = createCircle({ position: { x: -400, y: 200 }, radius: 2, velocity: { x: 4000, y: 0 }, isBullet: true, material: { restitution: 1 } });
    addBody(world, a);
    addBody(world, b);

    run(world, 20);

    expect(a.position.x).toBeLessThan(0);
    expect(b.position.x).toBeLessThan(0);
  });

  it('should not stop a bullet whose path misses a corner', () => {
    const world = zeroG();
    addBody(world, createRectangle({ position: { x: 0, y: 0 }, width: 20, height: 20, type: BodyType.STATIC }));
    // Passes 6 px below the box's bottom edge (y = 10), radius 3
    const ball = createCircle({ position: { x: -300, y: 19 }, radius: 3, velocity: { x: 3000, y: 0 }, isBullet: true });
    addBody(world, ball);

    run(world, 12);

    expect(ball.position.x).toBeGreaterThan(200);
    expect(ball.velocity.x).toBeCloseTo(3000, 6);
  });

  it('should ignore sensors and bodies excluded by layers', () => {
    const world = zeroG();
    addBody(world, createRectangle({ position: { x: 0, y: 0 }, width: 10, height: 200, type: BodyType.STATIC, isSensor: true }));
    addBody(world, createRectangle({ position: { x: 100, y: 0 }, width: 10, height: 200, type: BodyType.STATIC, layer: 2, collidesWith: 2 }));
    const ball = createCircle({ position: { x: -300, y: 0 }, radius: 3, velocity: { x: 3000, y: 0 }, isBullet: true, layer: 1, collidesWith: 1 });
    addBody(world, ball);

    run(world, 12);

    expect(ball.position.x).toBeGreaterThan(200);
  });

  it('should not teleport a bullet that already overlaps something', () => {
    const world = zeroG();
    addBody(world, createRectangle({ position: { x: 0, y: 0 }, width: 40, height: 40, type: BodyType.STATIC }));
    const ball = createCircle({ position: { x: 22, y: 0 }, radius: 5, velocity: { x: 60, y: 0 }, isBullet: true });
    addBody(world, ball);

    step(world, 1 / 60);

    // Moving away from the box it overlaps: the normal contact handles it, no pull-back
    expect(ball.position.x).toBeGreaterThan(22);
  });

  it('should stop a fast box bullet (swept as its inscribed circle)', () => {
    const world = zeroG();
    addBody(world, createRectangle({ position: { x: 0, y: 0 }, width: 8, height: 200, type: BodyType.STATIC, material: { restitution: 0.5 } }));
    const crate = createRectangle({ position: { x: -300, y: 0 }, width: 12, height: 12, velocity: { x: 3000, y: 0 }, isBullet: true });
    addBody(world, crate);

    run(world, 20);

    expect(crate.position.x).toBeLessThan(0);
  });

  it('should stop at a dynamic target and push it', () => {
    const world = zeroG();
    const target = createRectangle({ position: { x: 0, y: 0 }, width: 8, height: 60 });
    const ball = createCircle({ position: { x: -300, y: 0 }, radius: 3, velocity: { x: 3000, y: 0 }, isBullet: true, material: { restitution: 0 } });
    addBody(world, target);
    addBody(world, ball);

    run(world, 10);

    expect(target.velocity.x).toBeGreaterThan(0);
    expect(ball.position.x).toBeLessThan(target.position.x);
  });
});
