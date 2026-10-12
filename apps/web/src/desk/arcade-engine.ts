/** Original fixed-world runner. Pure simulation; no timers, audio or browser state. */
export const RUNNER_WORLD = { width: 640, height: 240, floor: 192, runnerX: 76, runnerSize: 24 } as const;
export type Run = {
  elapsed: number; score: number; height: number; velocity: number;
  distance: number; nextId: number; over: boolean;
  obstacles: { id: number; x: number; width: number; height: number }[];
};
type Edges = {left:number;right:number};
const defaultEdges:Edges = {left:0,right:RUNNER_WORLD.width};
export function newRun(edges:Edges=defaultEdges): Run {
  return { elapsed: 0, score: 0, height: 0, velocity: 0, distance: 0, nextId: 1, over: false,
    obstacles: [{ id: 0, x: edges.right-30, width: 22, height: 30 }] };
}
export function jumpRun(run: Run): Run {
  return run.over || run.height > 0 || run.velocity !== 0 ? run : { ...run, velocity: 430 };
}
export function stepRun(run: Run, delta: number, edges:Edges=defaultEdges): Run {
  if (run.over) return run;
  const dt = Math.max(0, Math.min(.04, Number.isFinite(delta) ? delta : 0));
  const elapsed = run.elapsed + dt;
  const speed = Math.min(300, 180 + elapsed * 3);
  const velocity = run.velocity - 1050 * dt;
  const height = Math.max(0, run.height + velocity * dt);
  const obstacles = run.obstacles.map(obstacle => ({ ...obstacle, x: obstacle.x - speed * dt }))
    .filter(obstacle => obstacle.x + obstacle.width > edges.left);
  let nextId = run.nextId;
  const last = obstacles.at(-1);
  if (!last || last.x < edges.right-330) {
    obstacles.push({ id: nextId, x: edges.right+20, width: nextId % 3 === 2 ? 30 : 22, height: nextId % 3 === 1 ? 36 : 30 });
    nextId++;
  }
  // Inset hitboxes forgive sprite corners without hiding actual ground contact.
  const over = obstacles.some(obstacle => obstacle.x + obstacle.width - 3 > RUNNER_WORLD.runnerX + 4
    && obstacle.x + 3 < RUNNER_WORLD.runnerX + RUNNER_WORLD.runnerSize - 4 && height + 4 < obstacle.height);
  const distance = run.distance + speed * dt;
  return { elapsed, score: Math.floor(distance / 10), height, velocity: height === 0 ? 0 : velocity,
    distance, nextId, obstacles, over };
}
