// Original procedural pixel art, distributed under Corral's MIT license. No external asset pack.
import type { Agent, AgentStatus } from "../herdr";
import { Canvas, hex, type RGB } from "../pixel";
import { BANG, CHECK, drawBubble, frameBorder, isIdle, label, P, SIZE, shade, sparkles, THEME } from "../render";
import { createScene, HEIGHT, period, pick, type Skin, WIDTH } from "../scene";
import type { Theme } from "./types";

const BLUE = hex("#29adff");
const CLOAKS: RGB[] = [BLUE, P.red, P.green, hex("#b48aff"), P.orange];
const HELMET = [
  "....SSSS....", "...SSSSSS...", "..SSWWSSSS..", "..SSSSSSSS..",
  "..SBBBBBBS..", "..SSBSBSSS..", "...SSSSSS...", "....SSSS....",
];
const BODY = [
  "...SSSSSS...", "..CCSSSSCC..", ".CCCCSSCCCC.", ".CCCSSSSCCC.",
  "..CCSSSSCC..", "...CCCCCC...", "...BBBBBB...",
];

function cloak(agent: Agent): RGB {
  return CLOAKS[pick(`pocket:${agent.identity}`, CLOAKS.length)]!;
}

/** Same original knight on a key and in the strip; motion affects pose, never identity. */
function knight(c: Canvas, agent: Agent, x: number, feet: number, scale: number, frame: number, moving: boolean, dir = 1): number {
  const dim = isIdle(agent.status) ? 0.38 : 1;
  const colour = shade(cloak(agent), dim);
  const palette = { S: shade(P.silver, dim), W: shade(P.white, dim), B: shade(P.navy, dim), C: colour };
  const bounce = agent.status === "blocked" ? [0, 1, 2, 1][frame % 4]! * scale : moving ? (frame % 2) * scale : 0;
  const top = Math.round(feet - 18 * scale - bounce);
  const left = Math.round(x - 6 * scale);
  // Cape peeks out from behind the shoulders.
  c.rect(left + (dir > 0 ? 0 : 9 * scale), top + 8 * scale, 3 * scale, 8 * scale, shade(colour, 0.6));
  c.pattern(HELMET, left, top, scale, palette);
  c.pattern(BODY, left, top + 8 * scale, scale, palette);
  const stride = moving && frame % 2 === 1 ? scale : 0;
  c.rect(left + 3 * scale - stride, top + 15 * scale, 2 * scale, 3 * scale, palette.B);
  c.rect(left + 7 * scale + stride, top + 15 * scale, 2 * scale, 3 * scale, palette.B);
  // Round shield with a readable team-coloured crest.
  c.pattern([".SSS.", "SCCCS", "SCWCS", "SCCCS", ".SSS."], left - scale, top + 9 * scale, scale, palette);
  if (agent.status === "done") {
    const pole = left + 13 * scale;
    c.rect(pole, top - 2 * scale, scale, 17 * scale, shade(P.brown, dim));
    c.pattern(["#####", "#####", "####.", "###.."], pole + scale, top - 2 * scale, scale, { "#": colour });
  } else if (agent.status === "working") {
    const swordX = left + 12 * scale;
    const swing = frame % 4 < 2 ? 0 : 2 * scale;
    c.rect(swordX + scale, top + 5 * scale + swing, scale, 8 * scale, palette.S);
    c.rect(swordX, top + 12 * scale + swing, 3 * scale, scale, shade(P.yellow, dim));
    c.rect(swordX + scale, top + 13 * scale + swing, scale, 2 * scale, palette.B);
  }
  return top;
}

function drawKey(agent: Agent, frame: number): Canvas {
  const c = new Canvas(SIZE, SIZE);
  const bg = THEME[agent.status].bg;
  c.rect(0, 0, SIZE, SIZE, bg);
  // A tiny stone alcove keeps the silhouette readable across every status.
  c.rect(10, 9, 100, 65, shade(bg, 0.65));
  c.rect(14, 12, 92, 60, shade(bg, 0.82));
  for (const y of [18, 36, 54]) c.rect(14, y, 92, 1, shade(bg, 1.2));
  for (const [x, y] of [[30, 12], [78, 12], [54, 36], [30, 54], [78, 54]]) c.rect(x!, y!, 1, 18, shade(bg, 1.2));
  knight(c, agent, agent.status === "blocked" || agent.status === "done" ? 53 : 60, 72, 3, frame, agent.status === "working");
  if (agent.status === "blocked") drawBubble(c, 88, 3, BANG, frame % 4 < 2 ? P.red : P.plum);
  if (agent.status === "done") {
    drawBubble(c, 88, 3, CHECK, P.forest);
    sparkles(c, frame, [[14, 20, 0], [92, 47, 3]]);
  }
  label(c, agent.workspace, THEME[agent.status].text, agent.subtitle);
  frameBorder(c, agent.focused ? P.white : shade(bg, 0.7), 3);
  return c;
}

function tree(c: Canvas, x: number, y: number, night: boolean): void {
  c.rect(x + 7, y + 17, 4, 12, shade(P.brown, night ? 0.45 : 0.8));
  c.pattern(["...##...", "..####..", ".######.", "########", ".######.", "..####.."], x, y, 2, { "#": hex(night ? "#183936" : "#3b7948") });
  c.pattern(["..##..", ".####.", "######", ".####."], x + 2, y + 9, 2, { "#": hex(night ? "#235245" : "#69a35a") });
}

function castle(c: Canvas, night: boolean): void {
  const stone = hex(night ? "#67758f" : "#c4c7d1");
  const dark = hex(night ? "#39475e" : "#8e9caf");
  const x = 354;
  c.rect(x, 31, 92, 35, dark);
  c.rect(x + 5, 32, 82, 33, stone);
  for (const tower of [x - 6, x + 70]) {
    c.rect(tower, 21, 28, 47, dark);
    c.rect(tower + 3, 24, 22, 41, stone);
    for (let i = 0; i < 3; i++) c.rect(tower + i * 10, 16, 8, 9, stone);
    c.rect(tower + 10, 32, 7, 12, night ? P.yellow : P.navy);
  }
  for (let y = 38; y < 65; y += 9) {
    c.rect(x + 23, y, 46, 1, dark);
    for (let bx = x + 24 + (y % 2) * 9; bx < x + 70; bx += 18) c.rect(bx, y - 8, 1, 8, dark);
  }
  c.rect(x + 36, 46, 21, 20, P.navy);
  c.rect(x + 40, 44, 13, 22, P.navy);
  for (let bar = 0; bar < 4; bar++) c.rect(x + 39 + bar * 5, 46, 1, 20, dark);
  c.rect(x + 46, 4, 1, 24, P.silver);
  c.pattern(["#####", "#####", "####.", "###.."], x + 47, 5, 2, { "#": BLUE });
}

const skin: Skin = {
  background(hour) {
    const p = period(hour);
    const night = p === "night";
    return {
      key: p,
      draw(c) {
        c.rect(0, 0, WIDTH, HEIGHT, hex(night ? "#111d36" : p === "dusk" ? "#75465b" : "#7cbed0"));
        if (night) {
          for (let i = 0; i < 32; i++) c.rect((i * 137 + 17) % WIDTH, 3 + (i * 13) % 36, 1, 1, P.silver);
          c.rect(700, 8, 12, 12, P.white);
          c.rect(705, 5, 12, 12, hex("#111d36"));
        } else {
          c.rect(694, 8, 14, 14, p === "dusk" ? P.orange : P.yellow);
          for (const x of [54, 226, 536]) {
            c.rect(x, 15, 32, 5, hex(p === "dusk" ? "#d79586" : "#d8edf0"));
            c.rect(x + 8, 11, 17, 4, hex(p === "dusk" ? "#d79586" : "#d8edf0"));
          }
        }
        // Hills are blocky silhouettes rather than external tiles.
        for (let x = 0; x < WIDTH; x += 8) {
          const hill = 40 + Math.round(Math.sin(x / 73) * 7);
          c.rect(x, hill, 8, HEIGHT - hill, hex(night ? "#203b40" : "#63865c"));
        }
        c.rect(0, 61, WIDTH, 10, hex(night ? "#244a65" : "#3d91b0"));
        for (let x = 0; x < WIDTH; x += 38) c.rect(x, 66, 17, 1, hex(night ? "#3d6480" : "#87ccd2"));
        c.rect(0, 71, WIDTH, HEIGHT - 71, hex(night ? "#243b35" : "#739451"));
        for (const [x, y] of [[12, 35], [167, 40], [298, 35], [481, 37], [621, 39], [757, 33]]) tree(c, x!, y!, night);
        castle(c, night);
        c.rect(382, 66, 35, 12, hex(night ? "#75685b" : "#bda57d"));
        for (let x = 384; x < 416; x += 6) c.rect(x, 66, 1, 12, shade(P.brown, 0.55));
        for (let i = 0; i < 42; i++) {
          const x = (i * 97 + 13) % WIDTH;
          const y = 76 + (i * 11) % 22;
          c.rect(x, y, 3, 1, hex(night ? "#385342" : "#91ac67"));
          if (i % 7 === 0) c.rect(x, y - 2, 2, 2, night ? P.slate : P.yellow);
        }
      },
    };
  },
  overlay(c, hour, frame) {
    // Warm torches flicker at night; the castle and landscape remain cached.
    if (period(hour) === "night") for (const x of [380, 419]) {
      c.rect(x, 54, 2, 5, P.brown);
      c.rect(x - 1, 50 - frame % 2, 4, 4, P.orange);
      c.rect(x, 51 - frame % 2, 2, 2, P.yellow);
    }
  },
  drawActor(c, { agent, x, feet, arrived, dir }, frame) {
    return knight(c, agent, x, feet, 2, frame, !arrived || agent.status === "working", dir);
  },
};

export const kingdomPocket: Theme = {
  id: "kingdom-pocket",
  name: "KINGDOM POCKET",
  drawKey,
  keyFrame(agent, frame) {
    const loops: Record<AgentStatus, number> = { working: 4, blocked: 4, done: 8, idle: 1, unknown: 1 };
    return frame % loops[agent.status];
  },
  scene: createScene(skin),
};
