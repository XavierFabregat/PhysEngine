// Ramp Sketch: draw lines to guide a ball into the goal cup.
// Uses: static boxes built from strokes, rolling friction, a rotating
// kinematic paddle, sensor goal + onCollisionStart.
import {
  createWorld,
  createCircle,
  createRectangle,
  addBody,
  removeBody,
  onCollisionStart,
  BodyType,
} from 'physengine';
import { drawPaper, drawBody, defaultStyle, stepWorld, DT } from './kit.js';

const INK_BUDGET = 900;
const MIN_SEGMENT = 14;
const THICKNESS = 8;

const LEVELS = [
  { name: 'Downhill', start: { x: 110, y: 70 }, goal: { x: 820, y: 540 }, walls: [], spinner: null },
  {
    name: 'The wall',
    start: { x: 110, y: 70 },
    goal: { x: 470, y: 540 },
    walls: [{ x: 470, y: 380, w: 240, h: 20 }, { x: 600, y: 450, w: 20, h: 160 }],
    spinner: null,
  },
  { name: 'Paddle', start: { x: 850, y: 70 }, goal: { x: 130, y: 540 }, walls: [{ x: 850, y: 300, w: 140, h: 16 }], spinner: { x: 480, y: 330, w: 170, h: 14, spin: 1.3 } },
];

export default {
  id: 'ramp',
  name: 'Ramp Sketch',
  tagline: 'Draw the track, then let the ball roll.',
  how: [
    'Drag on the paper to draw a ramp (you have 900 px of ink per level).',
    'Press Release ball: it drops from the dashed circle. Get it into the teal cup.',
    'Level 3 adds a spinning paddle: a kinematic body that bats the ball.',
  ],
  features: ['Static boxes from strokes', 'Rolling friction', 'Kinematic paddle', 'Sensor goal', 'onCollisionStart'],
  controls: [
    { id: 'release', label: 'Release ball', kind: 'button' },
    { id: 'undo', label: 'Undo stroke', kind: 'button' },
    { id: 'clear', label: 'Clear ink', kind: 'button' },
    { id: 'next', label: 'Next level', kind: 'button' },
  ],

  mount(stage) {
    let levelIndex = 0;
    let world;
    let strokes = [];
    let drawing = null;
    let ball = null;
    let status = 'Draw a ramp, then release the ball.';
    let flightTime = 0;
    let solved = new Set();

    const inkUsed = () =>
      strokes.reduce((s, stroke) => s + stroke.length, 0) + (drawing ? drawing.length : 0);

    const loadLevel = (index) => {
      levelIndex = index;
      const level = LEVELS[index];
      world = createWorld({ gravity: { x: 0, y: 450 } });
      strokes = [];
      ball = null;
      status = `Level ${index + 1}: ${level.name}. Draw a ramp, then release the ball.`;
      const solid = (x, y, w, h, extra = {}) =>
        addBody(world, createRectangle({ position: { x, y }, width: w, height: h, type: BodyType.STATIC, material: { friction: 0.6 }, ...extra }));

      // Goal cup: floor + two walls + a sensor inside
      const g = level.goal;
      solid(g.x, g.y + 10, 90, 12);
      solid(g.x - 45, g.y - 16, 10, 64);
      solid(g.x + 45, g.y - 16, 10, 64);
      addBody(world, createRectangle({ position: { x: g.x, y: g.y - 8 }, width: 70, height: 20, type: BodyType.STATIC, isSensor: true, userData: { kind: 'goal' } }));
      for (const w of level.walls) solid(w.x, w.y, w.w, w.h);
      if (level.spinner) {
        const s = level.spinner;
        addBody(world, createRectangle({ position: { x: s.x, y: s.y }, width: s.w, height: s.h, type: BodyType.KINEMATIC, angularVelocity: s.spin, userData: { kind: 'paddle' } }));
      }

      onCollisionStart(world, (a, b) => {
        const kinds = [a.userData?.kind, b.userData?.kind];
        if (kinds.includes('goal') && kinds.includes('ball')) {
          solved.add(levelIndex);
          status = `Solved in ${flightTime.toFixed(1)} s with ${Math.round(inkUsed())} px of ink. Try the next level.`;
        }
      });
    };
    loadLevel(0);

    // A stroke becomes a chain of thin static boxes, one per segment
    const commitStroke = (stroke) => {
      const bodies = [];
      for (let i = 1; i < stroke.points.length; i++) {
        const a = stroke.points[i - 1];
        const b = stroke.points[i];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const segment = createRectangle({
          position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          width: length + THICKNESS, // overlap at the joints so the ball rolls smoothly
          height: THICKNESS,
          rotation: Math.atan2(b.y - a.y, b.x - a.x),
          type: BodyType.STATIC,
          material: { friction: 0.5, restitution: 0.05 },
          userData: { kind: 'ink' },
        });
        addBody(world, segment);
        bodies.push(segment);
      }
      strokes.push({ length: stroke.length, bodies, points: stroke.points });
    };

    const onDown = (e) => {
      if (inkUsed() >= INK_BUDGET) {
        status = 'Out of ink: undo or clear a stroke.';
        return;
      }
      drawing = { points: [stage.toWorld(e)], length: 0 };
      stage.canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!drawing) return;
      const p = stage.toWorld(e);
      const last = drawing.points[drawing.points.length - 1];
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      if (d < MIN_SEGMENT) return;
      if (inkUsed() + d > INK_BUDGET) return;
      drawing.points.push(p);
      drawing.length += d;
    };
    const onUp = () => {
      if (drawing && drawing.points.length > 1) commitStroke(drawing);
      drawing = null;
    };
    stage.canvas.addEventListener('pointerdown', onDown);
    stage.canvas.addEventListener('pointermove', onMove);
    stage.canvas.addEventListener('pointerup', onUp);
    stage.canvas.addEventListener('pointercancel', onUp);

    const release = () => {
      if (ball) removeBody(world, ball.id);
      const s = LEVELS[levelIndex].start;
      ball = createCircle({ position: { x: s.x, y: s.y }, radius: 13, material: { friction: 0.5, restitution: 0.2 }, userData: { kind: 'ball' } });
      addBody(world, ball);
      flightTime = 0;
      status = 'Rolling…';
    };

    return {
      update() {
        stepWorld(world);
        if (ball) {
          flightTime += DT;
          if (ball.position.y > 680 || ball.position.x < -60 || ball.position.x > 1020) {
            removeBody(world, ball.id);
            ball = null;
            status = 'Lost the ball. Adjust the ramp and release again.';
          }
        }
      },
      render(colors) {
        const { ctx } = stage;
        drawPaper(ctx, colors);
        for (const body of world.bodies) {
          const kind = body.userData?.kind;
          if (kind === 'ink') continue; // drawn as strokes below
          const style = kind === 'ball'
            ? { fill: colors.coral, stroke: colors.coral, alpha: 0.4 }
            : kind === 'paddle'
              ? { fill: colors.signal, stroke: colors.signal, alpha: 0.35 }
              : defaultStyle(body, colors);
          drawBody(ctx, body, style);
        }
        // Ink strokes
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = THICKNESS;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const stroke of [...strokes, ...(drawing ? [drawing] : [])]) {
          ctx.globalAlpha = stroke === drawing ? 0.5 : 0.85;
          ctx.beginPath();
          stroke.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // Start marker when no ball is out
        if (!ball) {
          const s = LEVELS[levelIndex].start;
          ctx.strokeStyle = colors.coral;
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 13, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // Ink meter along the bottom edge
        const used = inkUsed() / INK_BUDGET;
        ctx.fillStyle = colors.grid;
        ctx.fillRect(20, 588, 920, 5);
        ctx.fillStyle = used > 0.9 ? colors.coral : colors.cobalt;
        ctx.fillRect(20, 588, 920 * Math.min(1, used), 5);
      },
      readouts: () => [
        { label: 'Level', value: `${levelIndex + 1} / ${LEVELS.length}` },
        { label: 'Ink', value: `${Math.round(inkUsed())} / ${INK_BUDGET} px` },
        { label: 'Solved', value: `${solved.size} / ${LEVELS.length}` },
        { label: 'Flight time', value: ball ? `${flightTime.toFixed(1)} s` : '—' },
        { label: 'Status', value: status, wide: true },
      ],
      control(id) {
        if (id === 'release') release();
        if (id === 'undo') {
          const last = strokes.pop();
          if (last) for (const b of last.bodies) removeBody(world, b.id);
        }
        if (id === 'clear') {
          for (const s of strokes) for (const b of s.bodies) removeBody(world, b.id);
          strokes = [];
        }
        if (id === 'next') loadLevel((levelIndex + 1) % LEVELS.length);
      },
      destroy() {
        stage.canvas.removeEventListener('pointerdown', onDown);
        stage.canvas.removeEventListener('pointermove', onMove);
        stage.canvas.removeEventListener('pointerup', onUp);
        stage.canvas.removeEventListener('pointercancel', onUp);
      },
      _debug: () => ({ world, levelIndex, solved: [...solved], status, ball, inkUsed: inkUsed() }),
    };
  },
};
