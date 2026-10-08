import type { Agent, AgentStatus } from "./herdr";
import { Canvas, drawText, FONT_3X5, hex, type RGB, textWidth } from "./pixel";
import { P } from "./render";
import type { Visible } from "./state";

export const WIDTH = 800;
export const HEIGHT = 100;
export const SEGMENT = 200;

export type Facing = 1 | -1;

export type Period = "day" | "dusk" | "night";

export function period(hour: number): Period {
	if (hour < 7 || hour >= 20) return "night";
	return hour >= 18 ? "dusk" : "day";
}

/** One agent's figure in the scene, as handed to a skin for drawing. */
export type Actor = {
	agent: Agent;
	x: number;
	feet: number;
	dir: Facing;
	/** False while the figure is still walking in to its spot. */
	arrived: boolean;
	seed: number;
};

/** The theme-specific part of a strip scene. */
export type Skin = {
	/** Full static backdrop; called once per distinct `key`, so it may be slow. */
	background(hour: number, frame: number): { key: string; draw(c: Canvas): void };
	/** Animated details drawn over the backdrop, before the actors. */
	overlay?(c: Canvas, hour: number, frame: number): void;
	/** Draws the figure and returns the y of the top of its head (for the tag pin). */
	drawActor(c: Canvas, actor: Actor, frame: number): number;
};

// Feet line per status: idle stay at the back, agents that need you come to the front.
const LANE: Record<AgentStatus, number> = { idle: 74, unknown: 74, working: 83, done: 87, blocked: 91 };

type Walker = { x: number; dir: Facing; home: string; arrived: boolean; seed: number };
type Placed = { agent: Agent; x: number; feet: number; column: number; row: number };

export function hash(text: string): number {
	let h = 2166136261;
	for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return h >>> 0;
}

/** Well-mixed hash for picking among a few options (plain FNV clusters on similar names). */
export function pick(text: string, options: number): number {
	let h = hash(text);
	h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return ((h ^ (h >>> 16)) >>> 0) % options;
}

/** Roaming range under the agent's key: top-row keys keep to the left of the segment, bottom-row to the right. */
function range(v: Visible): [number, number] {
	const left = v.column * SEGMENT;
	return v.row === 0 ? [left + 30, left + 115] : [left + 85, left + 170];
}

const TAG_STYLE: Record<AgentStatus, { bg: RGB; fg: RGB; icon: string }> = {
	blocked: { bg: P.red, fg: P.white, icon: "! " },
	done: { bg: P.forest, fg: P.white, icon: "✓ " },
	working: { bg: P.brown, fg: P.white, icon: "" },
	idle: { bg: hex("#1c2230"), fg: P.slate, icon: "" },
	unknown: { bg: hex("#1c2230"), fg: P.slate, icon: "" },
};
const TAG_MAX_TEXT = SEGMENT / 2 - 14;
// Top-row keys tag on the upper line, bottom-row keys on the lower one, so neighbouring tags never line up.
const TAG_Y = [2, 19];

/**
 * Tags follow their figure across the whole segment; tags sharing a line live in different segments,
 * so they never overlap.
 */
function tag(c: Canvas, p: Placed, head: number, frame: number, part: "pin" | "label"): void {
	const { agent, x } = p;
	const lo = p.column * SEGMENT + 4;
	const hi = p.column * SEGMENT + SEGMENT - 4;
	const y = TAG_Y[p.row] ?? 2;
	const style = TAG_STYLE[agent.status];
	const maxText = Math.min(TAG_MAX_TEXT, hi - lo - 6);
	let text = `${style.icon}${agent.workspace.toUpperCase()}`;
	if (textWidth(text, 2, FONT_3X5) > maxText) {
		while (text.length > 1 && textWidth(`${text}..`, 2, FONT_3X5) > maxText) text = text.slice(0, -1);
		text = `${text.trimEnd()}..`;
	}
	const w = textWidth(text, 2, FONT_3X5) + 6;
	const left = Math.round(Math.max(lo, Math.min(hi - w, x - w / 2)));
	const bg = agent.status === "blocked" && frame % 4 >= 2 ? P.plum : style.bg;
	if (part === "pin") {
		const ax = Math.round(Math.max(left + 2, Math.min(left + w - 3, x)));
		if (head - (y + 15) > 2) c.rect(ax, y + 15, 1, head - (y + 15) - 1, bg, 0.7);
		return;
	}
	c.rect(left, y, w, 14, bg);
	c.rect(left, y + 14, w, 1, P.black, 0.6);
	drawText(c, text, left + 3, y + 2, 2, style.fg, undefined, FONT_3X5);
}

export type Scene = {
	render(visible: Visible[], frame: number, hour?: number): Canvas;
	/** Returns the agent nearest to a tap at scene coordinate x, within the tapped segment. */
	agentAt(x: number): Agent | undefined;
};

export function createScene(skin: Skin): Scene {
	const walkers = new Map<string, Walker>();
	const backgrounds = new Map<string, Canvas>();
	let lastFrame = -1;
	let placed: Placed[] = [];

	function simulate(visible: Visible[], frame: number): void {
		// Spawning must happen on every call (the visible set can change within a frame); movement only once per frame.
		const steps = frame === lastFrame ? 0 : lastFrame < 0 ? 1 : Math.min(8, frame - lastFrame);
		lastFrame = frame;

		const alive = new Set(visible.map((v) => v.agent.paneId));
		for (const id of walkers.keys()) if (!alive.has(id)) walkers.delete(id);

		for (const v of visible) {
			const home = `${v.column}:${v.row}`;
			const [lo, hi] = range(v);
			const target = (lo + hi) / 2;
			let w = walkers.get(v.agent.paneId);
			if (!w || w.home !== home) {
				// Newly shown (or moved to another key): walk in from the edge of its segment.
				const entry = v.row === 0 ? v.column * SEGMENT + 4 : v.column * SEGMENT + SEGMENT - 4;
				w = { x: entry, dir: v.row === 0 ? 1 : -1, home, arrived: false, seed: hash(v.agent.paneId) };
				walkers.set(v.agent.paneId, w);
			}
			for (let s = 0; s < steps; s++) {
				if (!w.arrived) {
					w.dir = target >= w.x ? 1 : -1;
					w.x += w.dir * 4;
					if (Math.abs(target - w.x) <= 4) {
						w.x = target;
						w.arrived = true;
						w.dir = v.row === 0 ? 1 : -1;
					}
				} else if (v.agent.status === "working") {
					w.x += w.dir * 2;
					if (w.x <= lo || w.x >= hi) w.dir = w.x <= lo ? 1 : -1;
					w.x = Math.max(lo, Math.min(hi, w.x));
				}
			}
		}
	}

	function backdrop(hour: number, frame: number): Canvas {
		const { key, draw } = skin.background(hour, frame);
		let bg = backgrounds.get(key);
		if (!bg) {
			if (backgrounds.size > 48) backgrounds.clear();
			bg = new Canvas(WIDTH, HEIGHT);
			draw(bg);
			backgrounds.set(key, bg);
		}
		return bg;
	}

	return {
		render(visible, frame, hour = new Date().getHours()) {
			simulate(visible, frame);
			const c = new Canvas(WIDTH, HEIGHT);
			backdrop(hour, frame).data.copy(c.data);
			skin.overlay?.(c, hour, frame);

			placed = visible
				.map((v) => ({
					agent: v.agent,
					x: walkers.get(v.agent.paneId)!.x,
					feet: LANE[v.agent.status] + v.row * 3,
					column: v.column,
					row: v.row,
				}))
				.sort((a, b) => a.feet - b.feet || a.x - b.x);

			const heads = placed.map((p) => {
				const w = walkers.get(p.agent.paneId)!;
				return skin.drawActor(c, { agent: p.agent, x: p.x, feet: p.feet, dir: w.dir, arrived: w.arrived, seed: w.seed }, frame);
			});
			for (const part of ["pin", "label"] as const) {
				placed.forEach((p, i) => tag(c, p, heads[i]!, frame, part));
			}
			return c;
		},
		agentAt(x) {
			const column = Math.floor(x / SEGMENT);
			return placed.filter((p) => p.column === column).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]?.agent;
		},
	};
}
