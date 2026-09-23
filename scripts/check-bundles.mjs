// Verifies the single-file bundles load and simulate exactly like the
// module build: same falling-ball scenario, same numbers.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const scenario = (P) => {
  const world = P.createWorld();
  P.addBody(world, P.createRectangle({ position: { x: 0, y: 580 }, width: 800, height: 40, type: P.BodyType.STATIC }));
  const ball = P.createCircle({ position: { x: 0, y: 100 }, radius: 20, linearDamping: 0.1 });
  P.addBody(world, ball);
  let hits = 0;
  let impact = 0;
  P.onCollisionStart(world, (_a, _b, contact) => {
    hits++;
    impact = Math.max(impact, contact.impactSpeed);
  });
  for (let i = 0; i < 240; i++) P.step(world, 1 / 60);
  const ray = P.raycast(world, { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } });
  return { y: ball.position.y, hits, impact, rayDistance: ray?.distance };
};

const expected = scenario(await import('../dist/index.js'));
const esm = scenario(await import('../dist/physengine.min.js'));
const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../dist/physengine.iife.min.js', import.meta.url), 'utf8'), context);
const iife = scenario(vm.runInContext('PhysEngine', context));

const failures = [];
for (const [name, result] of Object.entries({ esm, iife })) {
  if (JSON.stringify(result) !== JSON.stringify(expected)) failures.push(`${name}: ${JSON.stringify(result)} != ${JSON.stringify(expected)}`);
}
if (!(expected.hits > 0 && expected.rayDistance > 0)) failures.push(`scenario did not exercise collisions/raycast: ${JSON.stringify(expected)}`);

if (failures.length) {
  console.error('Bundle check failed:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('Bundles OK (ESM + IIFE match the module build):', JSON.stringify(expected));
