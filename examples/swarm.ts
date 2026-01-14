/**
 * Particle Swarm
 * 
 * Demonstrates Vector2 operations: normalize, lerp, add, sub, length.
 * Particles smoothly follow a moving target using vector math.
 * 
 * Press Ctrl+C to exit.
 */

import { Vector2 as Vec2, math } from '../dist/index.js';

const WIDTH = 80;
const HEIGHT = 24;

interface Particle {
  position: Vec2.Vector2;
  velocity: Vec2.Vector2;
  trail: Vec2.Vector2[];
}

const particles: Particle[] = [];
const target = { x: 40, y: 12 };
let time = 0;

// Create particles at random positions
for (let i = 0; i < 25; i++) {
  particles.push({
    position: {
      x: math.randomRange(0, WIDTH),
      y: math.randomRange(0, HEIGHT),
    },
    velocity: Vec2.zero(),
    trail: [],
  });
}

function update() {
  time += 0.05;

  // Move target in a figure-8 pattern
  target.x = 40 + Math.cos(time) * 25;
  target.y = 12 + Math.sin(time * 2) * 8;

  // Update each particle
  for (const p of particles) {
    // Vector from particle to target
    const toTarget = Vec2.sub(target, p.position);
    const distance = Vec2.length(toTarget);

    if (distance > 0.5) {
      // Normalize to get direction
      const direction = Vec2.normalize(toTarget);

      // Scale by speed (slower when close)
      const speed = Math.min(distance * 0.1, 2.0);
      const desiredVelocity = Vec2.scale(direction, speed);

      // Smoothly interpolate velocity (creates organic movement)
      p.velocity = Vec2.lerp(p.velocity, desiredVelocity, 0.15);

      // Update position
      p.position = Vec2.add(p.position, p.velocity);

      // Keep trail
      p.trail.push({ ...p.position });
      if (p.trail.length > 5) {
        p.trail.shift();
      }
    } else {
      // Slow down when reached target
      p.velocity = Vec2.scale(p.velocity, 0.9);
      p.trail = [];
    }

    // Clamp to screen bounds
    p.position.x = math.clamp(p.position.x, 0, WIDTH - 1);
    p.position.y = math.clamp(p.position.y, 0, HEIGHT - 1);
  }
}

function render() {
  const screen: string[][] = Array(HEIGHT)
    .fill(null)
    .map(() => Array(WIDTH).fill(' '));

  // Draw particle trails
  for (const p of particles) {
    for (let i = 0; i < p.trail.length; i++) {
      const pos = p.trail[i];
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
        if (screen[y][x] === ' ') {
          screen[y][x] = '·';
        }
      }
    }
  }

  // Draw target
  const tx = Math.round(target.x);
  const ty = Math.round(target.y);
  if (tx >= 0 && tx < WIDTH && ty >= 0 && ty < HEIGHT) {
    screen[ty][tx] = '✦';
  }

  // Draw particles
  for (const p of particles) {
    const x = Math.round(p.position.x);
    const y = Math.round(p.position.y);
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      screen[y][x] = '•';
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
  console.log('\n✨ Particle Swarm - Vector Math Demo');
  console.log('━'.repeat(WIDTH + 2));
  console.log(`Target: (${target.x.toFixed(1)}, ${target.y.toFixed(1)})`);
  console.log(`Particles: ${particles.length}`);

  // Calculate average distance to target
  let avgDistance = 0;
  for (const p of particles) {
    avgDistance += Vec2.distance(p.position, target);
  }
  avgDistance /= particles.length;
  console.log(`Avg Distance to Target: ${avgDistance.toFixed(2)}`);

  // Show what vector operations are being used
  console.log('\nVector Operations Used:');
  console.log('  • Vec2.sub()       - Calculate direction to target');
  console.log('  • Vec2.normalize() - Get unit direction vector');
  console.log('  • Vec2.scale()     - Apply speed to direction');
  console.log('  • Vec2.lerp()      - Smooth velocity changes');
  console.log('  • Vec2.add()       - Update position');
  console.log('  • Vec2.distance()  - Measure proximity');

  console.log('\nPress Ctrl+C to exit');
}

// Animation loop
console.log('Starting Particle Swarm...\n');
const interval = setInterval(() => {
  update();
  render();
}, 50);

// Cleanup on exit
process.on('SIGINT', () => {
  clearInterval(interval);
  console.clear();
  console.log('\n👋 Particle Swarm stopped.\n');
  process.exit(0);
});

