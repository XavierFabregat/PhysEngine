// Lidar Rover: a top-down robot scans its surroundings with 180 raycasts a
// frame and builds a fading point-cloud map.
// Uses: raycast as a sensor (with a predicate filter), zero gravity,
// forces on a dynamic body, linear/angular damping, pushable crates.
import {
  createWorld,
  createCircle,
  createRectangle,
  createPolygon,
  addBody,
  raycast,
  applyForce,
  BodyType,
} from 'physengine';
import { WIDTH, HEIGHT, drawPaper, drawBody, defaultStyle, stepWorld, seeded } from './kit.js';

const RAYS = 180;
const RANGE = 330;
const MAP_POINTS = 7000;
const THRUST = 900; // px/s² of drive acceleration
// Damping rates in 1/s (top speed ≈ THRUST / ROVER_DAMPING ≈ 150 px/s)
const ROVER_DAMPING = 6;
const CRATE_DAMPING = 3;

export default {
  id: 'lidar',
  name: 'Lidar Rover',
  tagline: '180 raycasts a frame build a map of the room.',
  how: [
    'Drive with WASD or the arrow keys, or hold the pointer where the rover should go.',
    'Every frame the rover casts 180 rays; hits leave fading dots on the map.',
    'Turn off "Show world" to navigate by lidar alone. Crates can be pushed.',
  ],
  features: ['raycast ×180 / frame', 'Query filters', 'Zero gravity', 'applyForce', 'Damping', 'Pushable bodies'],
  controls: [
    { id: 'world', label: 'Show world', kind: 'toggle', checked: true },
    { id: 'rays', label: 'Show rays', kind: 'toggle', checked: true },
    { id: 'clear', label: 'Clear map', kind: 'button' },
  ],

  mount(stage) {
    const world = createWorld({ gravity: { x: 0, y: 0 } });
    const random = seeded(21);
    const keys = new Set();
    let target = null;
    let showWorld = true;
    let showRays = true;
    let scan = [];
    let scanMs = 0;
    const map = []; // { x, y, age, moving }

    const solid = (config) => addBody(world, createRectangle({ type: BodyType.STATIC, material: { friction: 0.3 }, ...config }));
    // Room walls
    solid({ position: { x: WIDTH / 2, y: 6 }, width: WIDTH, height: 12 });
    solid({ position: { x: WIDTH / 2, y: HEIGHT - 6 }, width: WIDTH, height: 12 });
    solid({ position: { x: 6, y: HEIGHT / 2 }, width: 12, height: HEIGHT });
    solid({ position: { x: WIDTH - 6, y: HEIGHT / 2 }, width: 12, height: HEIGHT });
    // Interior: partitions, pillars and a few odd shapes
    solid({ position: { x: 330, y: 170 }, width: 18, height: 260 });
    solid({ position: { x: 640, y: 430 }, width: 18, height: 260 });
    solid({ position: { x: 520, y: 120 }, width: 200, height: 18 });
    for (let i = 0; i < 5; i++) {
      addBody(world, createCircle({ position: { x: 150 + i * 170, y: 470 - (i % 2) * 300 }, radius: 16 + random() * 10, type: BodyType.STATIC }));
    }
    addBody(world, createPolygon({ position: { x: 820, y: 170 }, vertices: [{ x: -50, y: 30 }, { x: 50, y: 30 }, { x: 0, y: -40 }], type: BodyType.STATIC, rotation: 0.3 }));
    addBody(world, createPolygon({ position: { x: 180, y: 300 }, vertices: [0, 1, 2, 3, 4, 5].map((k) => ({ x: Math.cos(k * 1.047) * 34, y: Math.sin(k * 1.047) * 34 })), type: BodyType.STATIC }));
    // Pushable crates
    for (let i = 0; i < 6; i++) {
      addBody(world, createRectangle({
        position: { x: 420 + random() * 180, y: 230 + random() * 160 },
        width: 30 + random() * 20,
        height: 30 + random() * 20,
        rotation: random() * 3,
        material: { friction: 0.3, restitution: 0.1 },
        linearDamping: CRATE_DAMPING,
        angularDamping: CRATE_DAMPING,
        userData: { kind: 'crate' },
      }));
    }
    const rover = createCircle({
      position: { x: 90, y: 90 },
      radius: 15,
      material: { friction: 0.2, restitution: 0.1 },
      linearDamping: ROVER_DAMPING,
      angularDamping: ROVER_DAMPING,
      userData: { kind: 'rover' },
    });
    addBody(world, rover);

    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      if (e.type === 'keydown') keys.add(k);
      else keys.delete(k);
      e.preventDefault();
    };
    const onDown = (e) => {
      target = stage.toWorld(e);
      stage.canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (target) target = stage.toWorld(e);
    };
    const onUp = () => {
      target = null;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    stage.canvas.addEventListener('pointerdown', onDown);
    stage.canvas.addEventListener('pointermove', onMove);
    stage.canvas.addEventListener('pointerup', onUp);
    stage.canvas.addEventListener('pointercancel', onUp);

    const driveDirection = () => {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (target && x === 0 && y === 0) {
        x = target.x - rover.position.x;
        y = target.y - rover.position.y;
        if (Math.hypot(x, y) < 6) return { x: 0, y: 0 };
      }
      const length = Math.hypot(x, y);
      return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
    };

    const doScan = () => {
      const started = performance.now();
      const hits = [];
      for (let i = 0; i < RAYS; i++) {
        const angle = (i / RAYS) * Math.PI * 2;
        const direction = { x: Math.cos(angle), y: Math.sin(angle) };
        const hit = raycast(world, {
          origin: rover.position,
          direction,
          maxDistance: RANGE,
          filter: { predicate: (b) => b !== rover },
        });
        hits.push({ direction, hit });
      }
      scanMs = performance.now() - started;
      return hits;
    };

    return {
      update() {
        const dir = driveDirection();
        applyForce(rover, { x: dir.x * THRUST * rover.mass, y: dir.y * THRUST * rover.mass });
        stepWorld(world);

        scan = doScan();
        for (const { hit } of scan) {
          if (!hit) continue;
          map.push({ x: hit.point.x, y: hit.point.y, age: 0, moving: hit.body.type === 'dynamic' });
        }
        if (map.length > MAP_POINTS) map.splice(0, map.length - MAP_POINTS);
        for (const p of map) p.age++;
      },
      render(colors) {
        const { ctx } = stage;
        drawPaper(ctx, colors);
        if (showWorld) {
          for (const body of world.bodies) {
            if (body === rover) continue;
            const style = defaultStyle(body, colors);
            drawBody(ctx, body, { ...style, alpha: (style.alpha ?? 1) * 0.6 });
          }
        }
        // Map: static hits in ink, moving (crate) hits in coral; old points fade
        for (const p of map) {
          ctx.fillStyle = p.moving ? colors.coral : colors.ink;
          ctx.globalAlpha = Math.max(0.08, 1 - p.age / 900);
          ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
        ctx.globalAlpha = 1;
        if (showRays) {
          ctx.strokeStyle = colors.signal;
          ctx.globalAlpha = 0.28;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const { direction, hit } of scan) {
            const end = hit ? hit.point : { x: rover.position.x + direction.x * RANGE, y: rover.position.y + direction.y * RANGE };
            ctx.moveTo(rover.position.x, rover.position.y);
            ctx.lineTo(end.x, end.y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        drawBody(ctx, rover, { fill: colors.signal, stroke: colors.ink, alpha: 0.9 });
        if (target) {
          ctx.strokeStyle = colors.ink;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(rover.position.x, rover.position.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      },
      readouts() {
        let nearest = null;
        for (const { hit } of scan) if (hit && (!nearest || hit.distance < nearest.distance)) nearest = hit;
        return [
          { label: 'Rays / frame', value: RAYS },
          { label: 'Scan time', value: `${scanMs.toFixed(2)} ms` },
          { label: 'Nearest', value: nearest ? `${Math.round(nearest.distance)} px` : `> ${RANGE} px` },
          { label: 'Map points', value: map.length },
        ];
      },
      control(id, value) {
        if (id === 'world') showWorld = value;
        if (id === 'rays') showRays = value;
        if (id === 'clear') map.length = 0;
      },
      destroy() {
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        stage.canvas.removeEventListener('pointerdown', onDown);
        stage.canvas.removeEventListener('pointermove', onMove);
        stage.canvas.removeEventListener('pointerup', onUp);
        stage.canvas.removeEventListener('pointercancel', onUp);
      },
      _debug: () => ({ world, rover, scan, map: map.length, scanMs }),
    };
  },
};
