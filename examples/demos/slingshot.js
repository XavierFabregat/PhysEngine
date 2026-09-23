// Knockdown: a slingshot against box towers.
// Uses: SAT stacking, rotation + friction, collision events (scoring by impact
// speed), raycast (trajectory preview), createPolygon.
import {
  createWorld,
  createCircle,
  createRectangle,
  createPolygon,
  addBody,
  removeBody,
  onCollisionStart,
  raycast,
  BodyType,
} from 'physengine';
import { HEIGHT, drawPaper, drawBody, defaultStyle, createBursts, stepWorld, impactSpeed } from './kit.js';

const ANCHOR = { x: 170, y: 430 };
const MAX_PULL = 120;
const LAUNCH_GAIN = 8; // px/s of launch speed per px of pull
const GRAVITY = { x: 0, y: 400 };
const MAX_BALLS = 4;

const buildTowers = (world) => {
  const blocks = [];
  const block = (config) => {
    const b = config.vertices ? createPolygon(config) : createRectangle(config);
    b.userData = { kind: 'block', start: { ...b.position }, startRotation: b.rotation };
    addBody(world, b);
    blocks.push(b);
  };
  const wood = { friction: 0.6, restitution: 0.1, density: 1 };

  // Tower A: two posts, a lintel, a crate and a wedge on top
  block({ position: { x: 580, y: 520 }, width: 20, height: 80, material: wood });
  block({ position: { x: 660, y: 520 }, width: 20, height: 80, material: wood });
  block({ position: { x: 620, y: 470 }, width: 130, height: 20, material: wood });
  block({ position: { x: 620, y: 440 }, width: 40, height: 40, material: wood });
  block({ position: { x: 620, y: 420 }, vertices: [{ x: -20, y: 0 }, { x: 20, y: 0 }, { x: 0, y: -34 }], material: wood });

  // Tower B on a stone pedestal: a stack of crates
  for (let i = 0; i < 4; i++) block({ position: { x: 820, y: 480 - i * 40 }, width: 40, height: 40, material: wood });
  block({ position: { x: 820, y: 340 }, vertices: [{ x: -22, y: 0 }, { x: 22, y: 0 }, { x: 0, y: -30 }], material: wood });
  return blocks;
};

const makeWorld = () => {
  const world = createWorld({ gravity: GRAVITY });
  addBody(world, createRectangle({ position: { x: 480, y: 580 }, width: 960, height: 40, type: BodyType.STATIC, material: { friction: 0.8 } }));
  addBody(world, createRectangle({ position: { x: 820, y: 530 }, width: 140, height: 60, type: BodyType.STATIC, material: { friction: 0.8 } }));
  return world;
};

/** Parabola from the pouch, clipped at the first surface a raycast finds. */
const previewTrajectory = (world, velocity) => {
  const points = [{ ...ANCHOR }];
  let prev = ANCHOR;
  for (let t = 1 / 30; t < 3; t += 1 / 30) {
    const p = {
      x: ANCHOR.x + velocity.x * t,
      y: ANCHOR.y + velocity.y * t + 0.5 * GRAVITY.y * t * t,
    };
    const chord = { x: p.x - prev.x, y: p.y - prev.y };
    const length = Math.hypot(chord.x, chord.y);
    const hit = length > 0 ? raycast(world, { origin: prev, direction: chord, maxDistance: length }) : null;
    if (hit) return { points: [...points, hit.point], hit };
    points.push(p);
    if (p.y > HEIGHT + 40) break;
    prev = p;
  }
  return { points, hit: null };
};

export default {
  id: 'knockdown',
  name: 'Knockdown',
  tagline: 'Slingshot against two towers of crates.',
  how: [
    'Drag back from the pouch and release to fire.',
    'The dotted arc is the exact path; the ✕ is where a raycast says it will first hit.',
    'Heavier hits and chain reactions score more.',
  ],
  features: ['SAT stacking', 'Rotation + friction', 'onCollisionStart', 'raycast', 'createPolygon'],
  controls: [
    { id: 'reset', label: 'Rebuild towers', kind: 'button' },
    { id: 'slowmo', label: 'Slow motion', kind: 'toggle', checked: false },
  ],

  mount(stage) {
    let world;
    let blocks = [];
    let balls = [];
    let shots = 0;
    let score = 0;
    let strongest = 0;
    let aim = null;
    let slowmo = false;
    let tick = 0;
    const before = new Map();
    const bursts = createBursts();

    const reset = () => {
      world = makeWorld();
      blocks = buildTowers(world);
      balls = [];
      shots = 0;
      score = 0;
      strongest = 0;
      onCollisionStart(world, (a, b, contact) => {
        const kinds = [a.userData?.kind, b.userData?.kind];
        if (!kinds.includes('ball') && !(kinds[0] === 'block' && kinds[1] === 'block')) return;
        const speed = impactSpeed(a, b, contact, before);
        if (speed < 60) return;
        strongest = Math.max(strongest, speed);
        score += Math.round(speed / 10);
        if (speed > 140) bursts.add(contact.point, speed / 600);
      });
    };
    reset();

    const pullFrom = (point) => {
      const dx = point.x - ANCHOR.x;
      const dy = point.y - ANCHOR.y;
      const length = Math.hypot(dx, dy);
      const k = length > MAX_PULL ? MAX_PULL / length : 1;
      return { x: ANCHOR.x + dx * k, y: ANCHOR.y + dy * k };
    };
    const launchVelocity = (pouch) => ({
      x: (ANCHOR.x - pouch.x) * LAUNCH_GAIN,
      y: (ANCHOR.y - pouch.y) * LAUNCH_GAIN,
    });

    const onDown = (e) => {
      const p = stage.toWorld(e);
      if (Math.hypot(p.x - ANCHOR.x, p.y - ANCHOR.y) > 80) return;
      aim = pullFrom(p);
      stage.canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (aim) aim = pullFrom(stage.toWorld(e));
    };
    const onUp = () => {
      if (!aim) return;
      const pull = Math.hypot(aim.x - ANCHOR.x, aim.y - ANCHOR.y);
      if (pull > 12) {
        const ball = createCircle({
          position: { ...ANCHOR },
          radius: 16,
          velocity: launchVelocity(aim),
          material: { density: 3, restitution: 0.3, friction: 0.5 },
          userData: { kind: 'ball' },
        });
        addBody(world, ball);
        balls.push(ball);
        if (balls.length > MAX_BALLS) removeBody(world, balls.shift().id);
        shots++;
      }
      aim = null;
    };
    stage.canvas.addEventListener('pointerdown', onDown);
    stage.canvas.addEventListener('pointermove', onMove);
    stage.canvas.addEventListener('pointerup', onUp);
    stage.canvas.addEventListener('pointercancel', onUp);

    const toppled = () =>
      blocks.filter((b) => {
        const s = b.userData.start;
        return Math.hypot(b.position.x - s.x, b.position.y - s.y) > 25 || Math.abs(b.rotation - b.userData.startRotation) > 0.5;
      }).length;

    return {
      update() {
        tick++;
        if (slowmo && tick % 3 !== 0) return;
        stepWorld(world, before);
        // Balls that leave the screen are gone
        for (const ball of [...balls]) {
          if (ball.position.x > 1100 || ball.position.x < -140) {
            removeBody(world, ball.id);
            balls.splice(balls.indexOf(ball), 1);
          }
        }
      },
      render(colors) {
        const { ctx } = stage;
        drawPaper(ctx, colors);

        // Slingshot frame (decoration)
        ctx.strokeStyle = colors.graphite;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ANCHOR.x, 560);
        ctx.lineTo(ANCHOR.x, ANCHOR.y + 50);
        ctx.lineTo(ANCHOR.x - 22, ANCHOR.y - 8);
        ctx.moveTo(ANCHOR.x, ANCHOR.y + 50);
        ctx.lineTo(ANCHOR.x + 22, ANCHOR.y - 8);
        ctx.stroke();

        for (const body of world.bodies) {
          const style = body.userData?.kind === 'ball'
            ? { fill: colors.coral, stroke: colors.coral, alpha: 0.35 }
            : defaultStyle(body, colors);
          drawBody(ctx, body, style);
        }

        const pouch = aim ?? ANCHOR;
        // Bands
        ctx.strokeStyle = colors.coral;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ANCHOR.x - 22, ANCHOR.y - 8);
        ctx.lineTo(pouch.x, pouch.y);
        ctx.lineTo(ANCHOR.x + 22, ANCHOR.y - 8);
        ctx.stroke();

        if (aim) {
          const { points, hit } = previewTrajectory(world, launchVelocity(aim));
          ctx.fillStyle = colors.ink;
          points.forEach((p, i) => {
            if (i % 2 === 0) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          });
          if (hit) {
            ctx.strokeStyle = colors.signal;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(hit.point.x - 7, hit.point.y - 7);
            ctx.lineTo(hit.point.x + 7, hit.point.y + 7);
            ctx.moveTo(hit.point.x + 7, hit.point.y - 7);
            ctx.lineTo(hit.point.x - 7, hit.point.y + 7);
            ctx.moveTo(hit.point.x, hit.point.y);
            ctx.lineTo(hit.point.x + hit.normal.x * 18, hit.point.y + hit.normal.y * 18);
            ctx.stroke();
          }
          ctx.fillStyle = colors.coral;
          ctx.beginPath();
          ctx.arc(pouch.x, pouch.y, 16, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = colors.coral;
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ANCHOR.x, ANCHOR.y, 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        bursts.draw(ctx, colors.signal);
      },
      readouts: () => [
        { label: 'Shots', value: shots },
        { label: 'Score', value: score },
        { label: 'Toppled', value: `${toppled()} / ${blocks.length}` },
        { label: 'Hardest hit', value: `${Math.round(strongest)} px/s` },
      ],
      control(id, value) {
        if (id === 'reset') reset();
        if (id === 'slowmo') slowmo = value;
      },
      destroy() {
        stage.canvas.removeEventListener('pointerdown', onDown);
        stage.canvas.removeEventListener('pointermove', onMove);
        stage.canvas.removeEventListener('pointerup', onUp);
        stage.canvas.removeEventListener('pointercancel', onUp);
      },
      // For automated checks
      _debug: () => ({ world, blocks, toppled: toppled(), score, shots }),
    };
  },
};
