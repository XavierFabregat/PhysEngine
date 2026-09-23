// Shared helpers for the PhysEngine demos: stage (canvas + pointer mapping),
// fixed-timestep loop, theme colors and a filled body renderer.
import { step } from 'physengine';

/** Logical world size every demo is authored in (canvas scales to fit). */
export const WIDTH = 960;
export const HEIGHT = 600;
export const DT = 1 / 60;

const TOKENS = ['paper', 'grid', 'grid-major', 'ink', 'muted', 'cobalt', 'graphite', 'signal', 'coral', 'teal'];

/** Reads the page's color tokens (they change with the viewer's theme). */
export const readColors = () => {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(TOKENS.map((t) => [t, style.getPropertyValue(`--${t}`).trim()]));
};

/**
 * Wraps a canvas: crisp rendering at any device pixel ratio, drawing in
 * world units (WIDTH x HEIGHT), and pointer events mapped to world units.
 */
export const createStage = (canvas) => {
  const ctx = canvas.getContext('2d');
  let scale = 1;

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const cssWidth = canvas.getBoundingClientRect().width || WIDTH;
    scale = cssWidth / WIDTH;
    canvas.width = Math.round(WIDTH * scale * ratio);
    canvas.height = Math.round(HEIGHT * scale * ratio);
    ctx.setTransform(scale * ratio, 0, 0, scale * ratio, 0, 0);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  const toWorld = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  return { canvas, ctx, toWorld, destroy: () => observer.disconnect() };
};

/**
 * Runs `update` at a fixed 60 Hz (catching up after slow frames, capped) and
 * `render` once per animation frame. Returns a stop function.
 */
export const startLoop = (update, render) => {
  let last = performance.now();
  let accumulator = 0;
  let frame = 0;
  const tick = (now) => {
    accumulator = Math.min(accumulator + (now - last) / 1000, DT * 5);
    last = now;
    while (accumulator >= DT) {
      update(DT);
      accumulator -= DT;
    }
    render();
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
};

/** Advances the world by one fixed step. */
export const stepWorld = (world) => step(world, DT);

/** Graph-paper background with a 100 px scale bar (world units are px). */
export const drawPaper = (ctx, colors) => {
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 20) {
    ctx.strokeStyle = x % 100 === 0 ? colors['grid-major'] : colors.grid;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 20) {
    ctx.strokeStyle = y % 100 === 0 ? colors['grid-major'] : colors.grid;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WIDTH, y + 0.5);
    ctx.stroke();
  }
  // Scale bar: world units are pixels at 1:1
  ctx.strokeStyle = colors.muted;
  ctx.fillStyle = colors.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(WIDTH - 130, 22);
  ctx.lineTo(WIDTH - 30, 22);
  ctx.moveTo(WIDTH - 130, 17);
  ctx.lineTo(WIDTH - 130, 27);
  ctx.moveTo(WIDTH - 30, 17);
  ctx.lineTo(WIDTH - 30, 27);
  ctx.stroke();
  ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('100 px', WIDTH - 80, 40);
};

/** World-space vertices of a rectangle or polygon body. */
export const worldVertices = (body) => {
  const cos = Math.cos(body.rotation);
  const sin = Math.sin(body.rotation);
  return body.shape.vertices.map((v) => ({
    x: body.position.x + v.x * cos - v.y * sin,
    y: body.position.y + v.x * sin + v.y * cos,
  }));
};

/**
 * Draws one body filled + outlined. `style` = { fill, stroke, alpha }.
 * Circles get a radius line so rotation is visible.
 */
export const drawBody = (ctx, body, style) => {
  ctx.save();
  ctx.lineWidth = style.lineWidth ?? 1.5;
  ctx.strokeStyle = style.stroke;
  ctx.fillStyle = style.fill;
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.beginPath();
  if (body.shape.type === 'chain') {
    // Polyline: stroke only
    const points = worldVertices(body);
    ctx.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
    if (body.shape.loop) ctx.closePath();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (body.shape.type === 'circle') {
    ctx.arc(body.position.x, body.position.y, body.shape.radius, 0, Math.PI * 2);
  } else {
    const points = worldVertices(body);
    ctx.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
  }
  if (style.fill !== 'none') ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  if (body.shape.type === 'circle' && style.spin !== false) {
    ctx.beginPath();
    ctx.moveTo(body.position.x, body.position.y);
    ctx.lineTo(
      body.position.x + Math.cos(body.rotation) * body.shape.radius,
      body.position.y + Math.sin(body.rotation) * body.shape.radius
    );
    ctx.stroke();
  }
  ctx.restore();
};

/** Default look: static = graphite, dynamic = cobalt, sensors = dashed teal. */
export const defaultStyle = (body, colors) => {
  if (body.isSensor) return { fill: colors.teal, stroke: colors.teal, alpha: 0.12 };
  if (body.type === 'static' || body.type === 'kinematic') return { fill: colors.graphite, stroke: colors.graphite, alpha: 0.35 };
  return { fill: colors.cobalt, stroke: colors.cobalt, alpha: 0.18 };
};

/** Expanding rings where something hit hard (drawn and aged by the caller). */
export const createBursts = () => {
  const bursts = [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    add(point, strength) {
      if (bursts.length < 40) bursts.push({ x: point.x, y: point.y, age: 0, size: Math.min(1, strength) });
    },
    draw(ctx, color) {
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.age += DT;
        if (b.age > 0.45) {
          bursts.splice(i, 1);
          continue;
        }
        const t = b.age / 0.45;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, reduced ? 8 : 6 + t * 26 * (0.4 + b.size), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    },
  };
};

/** Seeded pseudo-random numbers, so layouts are the same on every load. */
export const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
