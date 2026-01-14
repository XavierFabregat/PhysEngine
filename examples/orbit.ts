/**
 * Orbit Visualizer
 * 
 * Demonstrates Transform rotation by showing planets orbiting a sun.
 * Uses Transform.transformPoint to convert local coordinates (orbit distance)
 * to world coordinates (screen position).
 * 
 * Press Ctrl+C to exit.
 */

import { Transform } from '../dist/index.js';

const WIDTH = 80;
const HEIGHT = 24;
const SUN = { x: 40, y: 12 };

interface Planet {
  distance: number;
  speed: number;
  angle: number;
  char: string;
  name: string;
}

const planets: Planet[] = [
  { distance: 6, speed: 0.15, angle: 0, char: '•', name: 'Mercury' },
  { distance: 10, speed: 0.10, angle: Math.PI, char: '○', name: 'Venus' },
  { distance: 14, speed: 0.08, angle: Math.PI / 2, char: '⊕', name: 'Earth' },
  { distance: 18, speed: 0.05, angle: Math.PI * 1.5, char: '◉', name: 'Mars' },
  { distance: 24, speed: 0.03, angle: Math.PI / 4, char: '◯', name: 'Jupiter' },
];

function render() {
  // Create empty screen
  const screen: string[][] = Array(HEIGHT)
    .fill(null)
    .map(() => Array(WIDTH).fill(' '));

  // Draw sun at center
  const sunX = Math.round(SUN.x);
  const sunY = Math.round(SUN.y);
  if (sunX >= 0 && sunX < WIDTH && sunY >= 0 && sunY < HEIGHT) {
    screen[sunY][sunX] = '☀';
  }

  // Draw orbit paths (faint dots)
  for (const planet of planets) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
      const transform = Transform.create(SUN, angle);
      const localPos = { x: planet.distance, y: 0 };
      const worldPos = Transform.transformPoint(transform, localPos);

      const x = Math.round(worldPos.x);
      const y = Math.round(worldPos.y);
      if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
        if (screen[y][x] === ' ') {
          screen[y][x] = '·';
        }
      }
    }
  }

  // Draw planets at their current positions
  for (const planet of planets) {
    // Create transform at sun's position with current rotation
    const transform = Transform.create(SUN, planet.angle);

    // Local position is distance from sun along x-axis
    const localPos = { x: planet.distance, y: 0 };

    // Transform to world space
    const worldPos = Transform.transformPoint(transform, localPos);

    const x = Math.round(worldPos.x);
    const y = Math.round(worldPos.y);
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      screen[y][x] = planet.char;
    }

    // Update angle for next frame
    planet.angle += planet.speed;
  }

  // Clear terminal and render
  console.clear();
  console.log('╔' + '═'.repeat(WIDTH) + '╗');
  for (const row of screen) {
    console.log('║' + row.join('') + '║');
  }
  console.log('╚' + '═'.repeat(WIDTH) + '╝');

  // Print info
  console.log('\n🪐 Orbit Visualizer - Transform Demo');
  console.log('━'.repeat(WIDTH + 2));
  for (const planet of planets) {
    const deg = ((planet.angle * 180) / Math.PI).toFixed(0);
    console.log(
      `${planet.char} ${planet.name.padEnd(10)} - Distance: ${planet.distance.toString().padStart(2)} - Angle: ${deg.padStart(3)}°`
    );
  }
  console.log('\nPress Ctrl+C to exit');
}

// Animation loop
console.log('Starting Orbit Visualizer...\n');
const interval = setInterval(render, 100);

// Cleanup on exit
process.on('SIGINT', () => {
  clearInterval(interval);
  console.clear();
  console.log('\n👋 Orbit Visualizer stopped.\n');
  process.exit(0);
});

