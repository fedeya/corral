/**
 * Theme template: a minimal but working theme that needs no image files (it draws a pixel slime).
 *
 * To make a new theme:
 *   1. Copy this file to src/themes/<id>.ts and rename `template` / `id` / `name`.
 *   2. Register it in src/themes/index.ts by adding it to THEMES. The last dial then cycles through it.
 *   3. Preview while you work, rebuild, and restart the plugin (see docs/adding-a-theme.md).
 *
 * Sprite sheets go in dev.fedeya.corral.sdPlugin/imgs/<id>/ and are loaded with loadSheet("<id>/file.png").
 * Credit the artist in imgs/CREDITS.md. If the license forbids redistribution, git-ignore the folder and
 * register the theme only when its art is present (see how kingdom uses hasImage in index.ts).
 */
import type { Agent, AgentStatus } from "../herdr";
import { Canvas, hex, type RGB } from "../pixel";
import { BANG, CHECK, drawBubble, frameBorder, isIdle, label, P, SIZE, shade, sparkles, THEME } from "../render";
import { createScene, HEIGHT, pick, type Skin, WIDTH } from "../scene";
import type { Theme } from "./types";

// --- Art ---------------------------------------------------------------------------------------------------
// Replace this with your sprites. With a sprite sheet you'd typically use:
//   c.blitScaled(sheet, frame * cellW + cropX, cropY, cropW, cropH, dx, dy, scale, { flip, tint, alpha })
// which scales (also below 1) with nearest-neighbour, mirrors with `flip`, and multiplies colours with `tint`.

const SLIME = [
	"....####....",
	"..########..",
	".##########.",
	".#W#####W##.",
	"###########.",
	"############",
	"############",
	".##########.",
];

/** Per-workspace variants. `pick` gives a stable, well-mixed choice from the workspace name. */
const COLOURS: RGB[] = [P.green, P.orange, hex("#29adff"), hex("#ff77a8"), P.yellow];

function colourFor(agent: Agent): RGB {
	return COLOURS[pick(`template:${agent.workspace}`, COLOURS.length)]!;
}

/** Draws the slime with its feet at (cx, feet); returns the y of its top. `squash` 0..2 flattens it. */
function slime(c: Canvas, colour: RGB, cx: number, feet: number, scale: number, squash = 0): number {
	const rows = SLIME.slice(squash);
	const top = feet - rows.length * scale;
	c.pattern(rows, Math.round(cx - 6 * scale), top, scale, { "#": colour, W: P.white });
	return top;
}

// --- Keys (120x120) ------------------------------------------------------------------------------------------
// Convention shared by the other themes: art in the top ~75px, workspace name in the bottom band via label(),
// a status-coloured background from THEME, idle dimmed so it doesn't stand out, a white border when focused.

function drawKey(agent: Agent, frame: number): Canvas {
	const c = new Canvas(SIZE, SIZE);
	const bg = THEME[agent.status].bg;
	c.rect(0, 0, SIZE, SIZE, bg);
	c.rect(8, 70, SIZE - 16, 3, shade(bg, 0.6));
	const colour = colourFor(agent);

	switch (agent.status) {
		case "working": {
			// Bounce in place.
			const lift = [0, 4, 7, 4][frame % 4]!;
			slime(c, colour, 60, 70 - lift, 4, lift === 0 ? 1 : 0);
			break;
		}
		case "blocked": {
			const hop = [0, 3, 5, 3][frame % 4]!;
			slime(c, colour, 50, 70 - hop, 4);
			drawBubble(c, 90 + (frame % 2 === 0 ? -1 : 1), 2, BANG, frame % 4 < 2 ? P.red : P.plum);
			break;
		}
		case "done":
			slime(c, colour, 50, 70, 4);
			drawBubble(c, 90, 2, CHECK, P.forest);
			sparkles(c, frame, [
				[84, 34, 0],
				[108, 40, 3],
			]);
			break;
		default:
			// Idle: slow breathing, dimmed.
			slime(c, shade(colour, 0.35), 60, 70, 4, Math.floor(frame / 4) % 2);
			break;
	}

	label(c, agent.workspace, THEME[agent.status].text);
	frameBorder(c, agent.focused ? P.white : shade(bg, 0.7), 3);
	return c;
}

/**
 * Must return the same number whenever drawKey would draw the same image, so images get cached.
 * Use the length of each state's animation loop (frames tick 8 times a second).
 */
function keyFrame(agent: Agent, frame: number): number {
	const loops: Record<AgentStatus, number> = { working: 4, blocked: 4, done: 8, idle: 8, unknown: 8 };
	return isIdle(agent.status) ? Math.floor(frame / 4) % 2 : frame % loops[agent.status];
}

// --- Touch strip (800x100, 4 frames a second) --------------------------------------------------------------
// The shared scene places one figure per visible key under that key, walks new ones in, moves working ones back
// and forth, and draws the name tags. The skin only paints the backdrop and the figures.

const skin: Skin = {
	// Static backdrop, cached by `key`: return a different key for each distinct look (e.g. per time of day).
	background() {
		return {
			key: "static",
			draw(c) {
				c.rect(0, 0, WIDTH, 60, hex("#1d2b53"));
				c.rect(0, 60, WIDTH, HEIGHT - 60, hex("#3b5d38"));
				c.rect(0, 60, WIDTH, 2, hex("#5a8a50"));
			},
		};
	},
	// Optional: animated bits behind the figures (clouds, water, ...).
	// overlay(c, hour, frame) {},
	drawActor(c, { agent, x, feet, arrived }, frame) {
		const colour = isIdle(agent.status) ? shade(colourFor(agent), 0.35) : colourFor(agent);
		const moving = !arrived || agent.status === "working";
		const hop = agent.status === "blocked" ? [0, 2, 4, 2][frame % 4]! : 0;
		const lift = moving ? [0, 2, 3, 2][frame % 4]! : 0;
		// `dir` (1 right, -1 left) tells you which way the figure faces; mirror sprites with { flip: dir < 0 }.
		return slime(c, colour, x, feet - hop - lift, 2, moving && lift === 0 ? 1 : 0);
	},
};

export const template: Theme = {
	id: "template",
	name: "SLIME",
	drawKey,
	keyFrame,
	// Optional: see the full agent list after every poll (kingdom uses it to deal jobs evenly).
	// prepare(agents) { return false; },
	scene: createScene(skin),
};
