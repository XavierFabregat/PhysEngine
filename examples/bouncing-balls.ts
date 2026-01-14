/**
 * Bouncing Balls
 * 
 * Demonstrates Vector2 operations and AABB collision detection.
 * Balls bounce off walls and detect collisions with each other using AABBs.
 * 
 * Press Ctrl+C to exit.
 */

import * as Vec2 from '../src/core/Vector2.js';
import * as AABB from '../src/core/AABB.js';

const WIDTH = 80;
const HEIGHT = 24;

interface Ball {
  position: Vec2.Vector2;
  velocity: Vec2.Vector2;
  radius: number;
  char: string;
}

const balls: Ball[] = [
  {
    position: { x: 20, y: 10 },
    velocity: { x: 1.2, y: 0.8 },
    radius: 2,
    char: '●',
  },
  {
    position: { x: 60, y: 15 },
    velocity: { x: -0.9, y: 1.1 },
    radius: 3,
    char: '◉',
  },
  {
    position: { x: 40, y: 8 },
    velocity: { x: 0.7, y: -0.6 },
    radius: 2,
    char: '◯',
  },
  {
    position: { x: 30, y: 18 },
    velocity: { x: -1.1, y: -0.9 },
    radius: 2.5,
    char: '⬤',
  },
];

let collisionCount = 0;

function update() {
  // Move all balls
  for (const ball of balls) {
    // Vector addition: position += velocity
    ball.position = Vec2.add(ball.position, ball.velocity);

    // Bounce off walls (reflect velocity)
    if (
      ball.position.x - ball.radius < 0 ||
      ball.position.x + ball.radius > WIDTH
    ) {
      ball.velocity = { x: -ball.velocity.x, y: ball.velocity.y };
      // Clamp position to stay in bounds
      ball.position.x = Math.max(
        ball.radius,
        Math.min(WIDTH - ball.radius, ball.position.x)
      );
    }
    if (
      ball.position.y - ball.radius < 0 ||
      ball.position.y + ball.radius > HEIGHT
    ) {
      ball.velocity = { x: ball.velocity.x, y: -ball.velocity.y };
      ball.position.y = Math.max(
        ball.radius,
        Math.min(HEIGHT - ball.radius, ball.position.y)
      );
    }
  }

  // Check ball-ball collisions using AABB broad phase
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const ballA = balls[i];
      const ballB = balls[j];

      // Create AABBs for broad phase check
      const aabbA = AABB.fromCenter(ballA.position, {
        x: ballA.radius,
        y: ballA.radius,
      });
      const aabbB = AABB.fromCenter(ballB.position, {
        x: ballB.radius,
        y: ballB.radius,
      });

      // Fast AABB overlap test
      if (AABB.overlaps(aabbA, aabbB)) {
        // Narrow phase: check actual circle collision
        const distance = Vec2.distance(ballA.position, ballB.position);
        const minDistance = ballA.radius + ballB.radius;

        if (distance < minDistance) {
          collisionCount++;

          // Simple elastic collision response
          const normal = Vec2.normalize(Vec2.sub(ballB.position, ballA.position));
          const relativeVelocity = Vec2.sub(ballB.velocity, ballA.velocity);
          const velocityAlongNormal = Vec2.dot(relativeVelocity, normal);

          // Don't resolve if balls are moving apart
          if (velocityAlongNormal < 0) {
            const impulse = Vec2.scale(normal, velocityAlongNormal);
            ballA.velocity = Vec2.add(ballA.velocity, impulse);
            ballB.velocity = Vec2.sub(ballB.velocity, impulse);
          }

          // Separate balls to prevent overlap
          const overlap = minDistance - distance;
          const separation = Vec2.scale(normal, overlap * 0.5);
          ballA.position = Vec2.sub(ballA.position, separation);
          ballB.position = Vec2.add(ballB.position, separation);
        }
      }
    }
  }
}

function render() {
  const screen: string[][] = Array(HEIGHT)
    .fill(null)
    .map(() => Array(WIDTH).fill(' '));

  // Draw balls
  for (const ball of balls) {
    // Draw AABB (for visualization)
    const aabb = AABB.fromCenter(ball.position, {
      x: ball.radius,
      y: ball.radius,
    });
    const minX = Math.max(0, Math.floor(aabb.min.x));
    const maxX = Math.min(WIDTH - 1, Math.ceil(aabb.max.x));
    const minY = Math.max(0, Math.floor(aabb.min.y));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(aabb.max.y));

    // Draw AABB corners
    if (minY >= 0 && minY < HEIGHT && minX >= 0 && minX < WIDTH)
      screen[minY][minX] = '┌';
    if (minY >= 0 && minY < HEIGHT && maxX >= 0 && maxX < WIDTH)
      screen[minY][maxX] = '┐';
    if (maxY >= 0 && maxY < HEIGHT && minX >= 0 && minX < WIDTH)
      screen[maxY][minX] = '└';
    if (maxY >= 0 && maxY < HEIGHT && maxX >= 0 && maxX < WIDTH)
      screen[maxY][maxX] = '┘';

    // Draw ball
    const x = Math.round(ball.position.x);
    const y = Math.round(ball.position.y);
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      screen[y][x] = ball.char;
    }

    // Draw velocity vector (for visualization)
    const velocityLength = Vec2.length(ball.velocity);
    if (velocityLength > 0) {
      const normalized = Vec2.normalize(ball.velocity);
      const arrowTip = Vec2.add(
        ball.position,
        Vec2.scale(normalized, ball.radius + 2)
      );
      const ax = Math.round(arrowTip.x);
      const ay = Math.round(arrowTip.y);
      if (ax >= 0 && ax < WIDTH && ay >= 0 && ay < HEIGHT) {
        screen[ay][ax] = '→';
      }
    }
  }

  // Render
  console.clear();
  console.log('╔' + '═'.repeat(WIDTH) + '╗');
  for (const row of screen) {
    console.log('║' + row.join('') + '║');
  }
  console.log('╚' + '═'.repeat(WIDTH) + '╝');

  // Print info
  console.log('\n⚽ Bouncing Balls - Vector2 & AABB Demo');
  console.log('━'.repeat(WIDTH + 2));
  console.log(`Total Collisions: ${collisionCount}`);
  console.log('\nBalls:');
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const speed = Vec2.length(ball.velocity).toFixed(2);
    console.log(
      `${ball.char} Ball ${i + 1} - Pos: (${ball.position.x.toFixed(1)}, ${ball.position.y.toFixed(1)}) - Speed: ${speed}`
    );
  }
  console.log('\nPress Ctrl+C to exit');
}

// Animation loop
console.log('Starting Bouncing Balls...\n');
const interval = setInterval(() => {
  update();
  render();
}, 50);

// Cleanup on exit
process.on('SIGINT', () => {
  clearInterval(interval);
  console.clear();
  console.log('\n👋 Bouncing Balls stopped.\n');
  process.exit(0);
});

