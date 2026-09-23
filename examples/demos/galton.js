// Galton board: balls rain through pegs into sensor bins; the histogram is
// compared with the ideal binomial distribution.
// Uses: circle-circle contacts at scale, sensors + onCollisionStart,
// removing bodies from inside an event handler, runtime material changes.
import {
  createWorld,
  createCircle,
  createRectangle,
  addBody,
  removeBody,
  onCollisionStart,
  BodyType,
} from 'physengine';
import { drawPaper, drawBody, defaultStyle, stepWorld, seeded } from './kit.js';

const ROWS = 12;
const BINS = ROWS + 1;
const CENTER_X = 480;
const PEG_DX = 36;
const PEG_DY = 30;
const TOP = 100;
const BIN_TOP = 468;
const FLOOR_TOP = 560;
const MAX_LIVE = 60;
const BALL_RADIUS = 11; // wide enough to block the lattice's diagonal corridors
const RESTITUTION = 0.15;
const BOUNCY = 0.6;

/** Ideal share of balls per bin for an unbiased board: C(n, k) / 2^n. */
const binomial = (() => {
  const shares = [];
  let c = 1;
  for (let k = 0; k <= ROWS; k++) {
    shares.push(c / 2 ** ROWS);
    c = (c * (ROWS - k)) / (k + 1);
  }
  return shares;
})();

const binX = (k) => CENTER_X + (k - ROWS / 2) * PEG_DX;

export default {
  id: 'galton',
  name: 'Galton Board',
  tagline: 'Twelve rows of pegs turn chaos into a bell curve.',
  how: [
    'Balls rain from the top; click above the pegs to drop your own.',
    'Each bin is a sensor: onCollisionStart counts the ball and removes it.',
    'The line is the ideal binomial curve, C(12, k) / 2¹². Real balls keep some momentum and skip pegs, so the measured spread runs a little wider; try Bouncy pegs.',
  ],
  features: ['Sensors', 'onCollisionStart', 'removeBody in a handler', 'Circle contacts', 'Runtime materials'],
  controls: [
    { id: 'rain', label: 'Rain', kind: 'toggle', checked: true },
    { id: 'burst', label: 'Drop 50', kind: 'button' },
    { id: 'bouncy', label: 'Bouncy pegs', kind: 'toggle', checked: false },
    { id: 'reset', label: 'Reset counts', kind: 'button' },
  ],

  mount(stage) {
    const world = createWorld({ gravity: { x: 0, y: 500 } });
    const random = seeded(7);
    const counts = new Array(BINS).fill(0);
    const flash = new Array(BINS).fill(0);
    let dropped = 0;
    let rain = true;
    let queued = 0;
    let bounce = RESTITUTION;
    let tick = 0;
    const before = new Map();

    const wall = (x, y, w, h) =>
      addBody(world, createRectangle({ position: { x, y }, width: w, height: h, type: BodyType.STATIC, material: { friction: 0.1 } }));

    // Board frame, pegs, bin dividers, floor
    wall(CENTER_X - 250, 320, 12, 520);
    wall(CENTER_X + 250, 320, 12, 520);
    wall(CENTER_X, FLOOR_TOP + 20, 520, 40);
    // Staggered lattice across the full width (a peg triangle leaves empty
    // space at its sides, where balls with sideways speed fall straight down)
    for (let row = 0; row < ROWS; row++) {
      const offset = row % 2 === 0 ? 0 : 0.5;
      for (let j = -7; j <= 7; j++) {
        const x = CENTER_X + (j + offset) * PEG_DX;
        if (Math.abs(x - CENTER_X) > 236) continue;
        const peg = createCircle({
          position: { x, y: TOP + row * PEG_DY },
          radius: 5,
          type: BodyType.STATIC,
          material: { restitution: RESTITUTION, friction: 0.05 },
          userData: { kind: 'peg' },
        });
        addBody(world, peg);
      }
    }
    for (let k = 0; k <= BINS; k++) {
      const x = binX(k) - PEG_DX / 2;
      wall(x, (BIN_TOP + FLOOR_TOP) / 2, 4, FLOOR_TOP - BIN_TOP);
    }
    for (let k = 0; k < BINS; k++) {
      addBody(world, createRectangle({
        position: { x: binX(k), y: FLOOR_TOP - 8 },
        width: PEG_DX - 8,
        height: 12,
        type: BodyType.STATIC,
        isSensor: true,
        userData: { kind: 'bin', index: k },
      }));
    }

    onCollisionStart(world, (a, b) => {
      const bin = a.userData?.kind === 'bin' ? a : b.userData?.kind === 'bin' ? b : null;
      const ball = a.userData?.kind === 'ball' ? a : b.userData?.kind === 'ball' ? b : null;
      if (!bin || !ball) return;
      counts[bin.userData.index]++;
      flash[bin.userData.index] = 1;
      // Safe: events run after the step has finished
      removeBody(world, ball.id);
    });

    const live = () => world.bodies.filter((b) => b.userData?.kind === 'ball').length;

    const drop = (x) => {
      if (live() >= MAX_LIVE) return;
      addBody(world, createCircle({
        position: { x: x + (random() - 0.5) * 4, y: 50 },
        radius: BALL_RADIUS,
        material: { restitution: bounce, friction: 0.05 },
        userData: { kind: 'ball' },
      }));
      dropped++;
    };

    const onDown = (e) => {
      const p = stage.toWorld(e);
      if (p.y < TOP - 10 && Math.abs(p.x - CENTER_X) < 230) drop(p.x);
    };
    stage.canvas.addEventListener('pointerdown', onDown);

    const stats = () => {
      const total = counts.reduce((s, c) => s + c, 0);
      if (total === 0) return { total, mean: null, sd: null };
      const mean = counts.reduce((s, c, k) => s + c * k, 0) / total;
      const variance = counts.reduce((s, c, k) => s + c * (k - mean) ** 2, 0) / total;
      return { total, mean, sd: Math.sqrt(variance) };
    };

    return {
      update() {
        tick++;
        if (rain && tick % 8 === 0) drop(CENTER_X);
        if (queued > 0 && tick % 4 === 0) {
          drop(CENTER_X);
          queued--;
        }
        stepWorld(world, before);
        // Anything that escapes the board is removed
        for (const b of world.bodies) if (b.userData?.kind === 'ball' && b.position.y > 700) removeBody(world, b.id);
      },
      render(colors) {
        const { ctx } = stage;
        drawPaper(ctx, colors);

        // Histogram behind the bins, scaled so the tallest expected bar fits
        const { total } = stats();
        const maxShare = binomial[ROWS / 2];
        const barScale = (FLOOR_TOP - BIN_TOP - 16) / Math.max(maxShare * total, ...counts, 1);
        for (let k = 0; k < BINS; k++) {
          const h = counts[k] * barScale;
          ctx.fillStyle = colors.cobalt;
          ctx.globalAlpha = 0.22 + flash[k] * 0.5;
          ctx.fillRect(binX(k) - PEG_DX / 2 + 3, FLOOR_TOP - h, PEG_DX - 6, h);
          flash[k] = Math.max(0, flash[k] - 0.06);
        }
        ctx.globalAlpha = 1;

        // Ideal binomial curve for the same number of balls
        if (total > 0) {
          ctx.strokeStyle = colors.signal;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          binomial.forEach((share, k) => {
            const y = FLOOR_TOP - share * total * barScale;
            if (k === 0) ctx.moveTo(binX(k), y);
            else ctx.lineTo(binX(k), y);
          });
          ctx.stroke();
        }

        for (const body of world.bodies) {
          if (body.userData?.kind === 'bin') continue;
          const style = body.userData?.kind === 'ball'
            ? { fill: colors.coral, stroke: colors.coral, alpha: 0.55, spin: false }
            : body.userData?.kind === 'peg'
              ? { fill: colors.ink, stroke: colors.ink, alpha: 0.8, spin: false }
              : defaultStyle(body, colors);
          drawBody(ctx, body, style);
        }

        // Bin counts
        ctx.fillStyle = colors.muted;
        ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        counts.forEach((c, k) => ctx.fillText(String(c), binX(k), FLOOR_TOP + 16));
      },
      readouts() {
        const { total, mean, sd } = stats();
        return [
          { label: 'Dropped', value: dropped },
          { label: 'Binned', value: total },
          { label: 'Mean bin', value: mean === null ? '—' : `${mean.toFixed(2)} (ideal 6)` },
          { label: 'Spread σ', value: sd === null ? '—' : `${sd.toFixed(2)} (ideal ${Math.sqrt(ROWS / 4).toFixed(2)})` },
        ];
      },
      control(id, value) {
        if (id === 'rain') rain = value;
        if (id === 'burst') queued += 50;
        if (id === 'bouncy') {
          // Restitution combines by min, so pegs and balls both change
          bounce = value ? BOUNCY : RESTITUTION;
          for (const b of world.bodies) if (b.userData?.kind === 'peg' || b.userData?.kind === 'ball') b.material.restitution = bounce;
        }
        if (id === 'reset') {
          counts.fill(0);
          dropped = 0;
        }
      },
      destroy() {
        stage.canvas.removeEventListener('pointerdown', onDown);
      },
      _debug: () => ({ counts: [...counts], dropped, live: live(), ...stats() }),
    };
  },
};
