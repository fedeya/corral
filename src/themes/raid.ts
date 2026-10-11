// Original Corral pixel patterns, MIT; no sprite packs required.
import type { Agent } from "../herdr";
import { Canvas, drawText, drawTextCentered, fitText, FONT_3X5, hex } from "../pixel";
import { RaidRound, raidRound } from "../raid";
import { frameBorder, label, P, SIZE, sparkles } from "../render";
import { HEIGHT, pick, SEGMENT, WIDTH } from "../scene";
import type { Visible } from "../state";
import type { Theme } from "./types";

const INK = hex("#12182b");
const FLOOR = hex("#26334a");
const HERO = [
 "....HHHH....", "...HWWWH....", "...HWBWH....", "....WWW.....",
 "..SSCCCCSS..", ".SSSCCCCSSS.", "..SSCCCCSS..", "....CCCC....",
 "....CCCC....", "...CCCCCC...", "...BB..BB...", "...BB..BB...",
 "..BBB..BBB..",
];
const BOSS = [
 "..G................G..", "..GG..............GG..", "...GG...GGGGG....GG...",
 "....GGGGPPPPPGGGG.....", "...GPPPPPPPPPPPPPG....", "..GPPWWPPPPPPWWPPPG...",
 "..GPPWBPPPPPPBWPPPG...", "..GPPPPPPPPPPPPPPPG...", "...GPPPPWWWWPPPPPG....",
 "....GPPPWBBWPPPPG.....", "...GGPPPPPPPPPPPGG....", "..GPPPGGGGGGGGPPPPG...",
 ".GPPPG..GGGG..GPPPPG..", "..GGG...GGGG...GGGG...", "......GGGGGGGG........",
 ".....GGG....GGG.......", "....GGGG....GGGG......",
];

function hero(c: Canvas, agent: Agent, x: number, y: number, scale: number, frame: number): void {
 const color = [P.orange, P.green, hex("#29adff"), P.plum][pick(agent.identity, 4)]!;
 const hop = agent.status === "working" || agent.status === "blocked" ? frame % 2 * scale : 0;
 c.pattern(HERO, x, y - hop, scale, { H: P.silver, W: P.white, B: INK, S: P.silver, C: color });
 if (agent.status === "working") c.pattern(["..W", ".W.", "W..", ".O.", "..O"], x + 11 * scale, y + 3 * scale - hop, scale, { W: P.white, O: P.orange });
 if (agent.status === "blocked") drawText(c, "!", x + 13 * scale, y, scale, frame % 2 ? P.red : P.yellow, INK, FONT_3X5);
 if (agent.status === "done") sparkles(c, frame, [[x - 4, y + 4, 0], [x + 12 * scale, y + 20, 3]]);
 if (agent.status === "idle" || agent.status === "unknown") c.rect(x, y, 12 * scale, 13 * scale, INK, 0.5);
}

function boss(c: Canvas, x: number, y: number, scale: number, frame: number, defeated: boolean): void {
 if (defeated) {
  c.pattern(["Y...Y", "Y.Y.Y", "YYYYY", ".YYY.", ".YYY.", "..Y..", ".YYY."], x + 7 * scale, y, scale, { Y: P.yellow });
  sparkles(c, frame, [[x, y + 4, 0], [x + 40, y + 10, 3], [x + 16, y + 34, 5]]);
 } else {
  c.pattern(BOSS, x, y + (frame % 2), scale, { G: P.silver, P: P.plum, W: P.white, B: INK });
 }
}

function title(round: RaidRound): string {
 const v = round.view;
 return v.offline ? "RAID PAUSED - HERDR OFF" : v.phase === "ready" ? "RAID READY - PRESS RAID ROUND" : v.phase === "victory" ? `ROUND ${v.round} - VICTORY!` : `ROUND ${v.round} - CRYSTAL WARDEN`;
}

export function raidControl(round: RaidRound, frame: number): Canvas {
 const c = new Canvas(SIZE, SIZE);
 const v = round.view;
 c.rect(0, 0, SIZE, SIZE, INK);
 drawTextCentered(c, "RAID ROUND", 7, 2, P.white, undefined, FONT_3X5);
 boss(c, 27, 25, 3, frame, v.phase === "victory");
 drawTextCentered(c, v.offline ? "HERDR OFF" : v.phase === "ready" ? "START" : v.phase === "victory" ? "VICTORY!" : `HP ${v.hp}/${v.maxHp}`, 82, 2, P.yellow, undefined, FONT_3X5);
 drawTextCentered(c, v.phase === "ready" ? "PRESS TO START" : "PRESS TO RESET", 104, 1, P.silver, undefined, FONT_3X5);
 frameBorder(c, P.plum, 3);
 return c;
}

export function createRaidTheme(round: RaidRound): Theme {
 let placed: Visible[] = [];
 return {
  id: "raid", name: "RAID",
  // Keep semantic state separate from animation; no packed arithmetic or roster-size limits.
  keyState: agent => JSON.stringify([round.view.round, round.member(agent.paneId)]),
  keyFrame: (_agent, frame) => frame % 8,
  drawKey(agent, frame) {
   const c = new Canvas(SIZE, SIZE);
   c.rect(0, 0, SIZE, SIZE, INK);
   c.rect(5, 70, 110, 7, FLOOR);
   drawTextCentered(c, `RAID ${round.view.round || "READY"}`, 5, 1, P.silver, undefined, FONT_3X5);
   hero(c, agent, 32, 18, 4, frame);
   label(c, agent.workspace, P.white, agent.subtitle);
   const mark = agent.status === "blocked" ? "HELP!" : round.member(agent.paneId) === "hit" ? "HIT LANDED" : round.member(agent.paneId) === "next-round" ? "NEXT ROUND" : "HIT PENDING";
   drawTextCentered(c, mark, 108, 1, agent.status === "blocked" ? P.red : P.yellow, undefined, FONT_3X5);
   frameBorder(c, agent.focused ? P.white : agent.status === "blocked" ? P.red : P.plum, 3);
   return c;
  },
  scene: {
   // Each device owns its hit targets, but all devices observe the same raid round.
   fork: () => createRaidTheme(round).scene,
   render(visible, frame) {
    placed = visible;
    const c = new Canvas(WIDTH, HEIGHT);
    const v = round.view;
    c.rect(0, 0, WIDTH, HEIGHT, INK);
    c.rect(0, 86, WIDTH, 14, FLOOR);
    for (let x = 0; x < WIDTH; x += 32) c.rect(x, 86, 16, 2, P.slate);
    drawText(c, title(round), 8, 4, 2, v.phase === "victory" ? P.yellow : P.white, undefined, FONT_3X5);
    const hint = v.help.length ? `HELP ${v.help.length} - TAP AGENT` : v.missing.length ? `MISSING ${v.missing.length} - RESET?` : v.phase === "active" ? `HP ${v.hp}/${v.maxHp} - ONE HIT EACH` : "USE RAID ROUND KEY";
    drawText(c, hint, 492, 5, 1, v.help.length ? P.red : P.silver, undefined, FONT_3X5);
    c.rect(492, 17, 288, 4, FLOOR);
    if (v.maxHp) c.rect(492, 17, Math.round(288 * v.hp / v.maxHp), 4, P.plum);
    boss(c, 378, 31, 2, frame, v.phase === "victory");
    for (const { agent, column, row } of visible) {
     const x = column * SEGMENT + (row === 0 ? 44 : 146);
     const name = fitText(agent.subtitle ?? agent.workspace, 86, 1, FONT_3X5);
     drawText(c, name, x - 22, 30 + row * 13, 1, agent.status === "blocked" ? P.red : P.silver, undefined, FONT_3X5);
     hero(c, agent, x - 12, 61 + row * 4, 2, frame);
     if (round.member(agent.paneId) === "hit") drawText(c, "✓", x + 16, 75, 2, P.green, undefined, FONT_3X5);
    }
    return c;
   },
   agentAt(x) {
    const column = Math.floor(x / SEGMENT);
    return placed.filter(v => v.column === column).sort((a, b) => Math.abs(a.column * SEGMENT + (a.row === 0 ? 44 : 146) - x) - Math.abs(b.column * SEGMENT + (b.row === 0 ? 44 : 146) - x))[0]?.agent;
   },
  },
 };
}

export const raid = createRaidTheme(raidRound);
