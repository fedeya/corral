// Art: "Tiny Swords" by Pixel Frog (https://pixelfrog-assets.itch.io/tiny-swords). Free to use, but not
// redistributable, so the sprites in imgs/kingdom/ are git-ignored and must be copied in locally.
import type { PNG } from "pngjs";
import type { Agent } from "../herdr";
import { Canvas, hex, loadSheet, type RGB } from "../pixel";
import { BANG, CHECK, drawBubble, frameBorder, isIdle, label, P, SIZE, shade, sparkles, THEME } from "../render";
import { createScene, type Facing, HEIGHT, hash, type Period, period, pick, type Skin, WIDTH } from "../scene";
import type { Theme } from "./types";

export const KINGDOM_PROBE = "kingdom/Castle.png";

const sheets = new Map<string, PNG>();
function sheet(name: string): PNG {
	let png = sheets.get(name);
	if (!png) {
		png = loadSheet(`kingdom/${name}.png`);
		sheets.set(name, png);
	}
	return png;
}

const TEAMS = ["Blue", "Red", "Yellow", "Purple", "Black"] as const;
type Tool = "Axe" | "Pickaxe" | "Hammer" | "Knife";
type Load = "Wood" | "Gold" | "Meat";
type Anim = "Idle" | "Run" | `Idle${Tool | Load}` | `Interact${Tool}` | `Run${Tool | Load}`;

// Jobs and team colours are dealt round-robin over all workspaces (in a shuffled but stable order),
// so every job and colour shows up about equally often.
let roster = "";
const dealt = new Map<string, { job: number; team: number }>();

function prepare(agents: Agent[]): boolean {
	const workspaces = [...new Set(agents.map((a) => a.identity))].sort();
	const key = workspaces.join("\n");
	if (key === roster) return false;
	roster = key;
	dealt.clear();
	const order = (salt: string) =>
		[...workspaces].sort((a, b) => hash(`${salt}:${a}`) - hash(`${salt}:${b}`) || a.localeCompare(b));
	const jobs = order("job");
	const teams = order("team");
	for (const w of workspaces) dealt.set(w, { job: jobs.indexOf(w) % JOBS.length, team: teams.indexOf(w) % TEAMS.length });
	return true;
}

function deal(agent: Agent): { job: number; team: number } {
	return dealt.get(agent.identity) ?? { job: pick(`job:${agent.identity}`, JOBS.length), team: pick(`team:${agent.identity}`, TEAMS.length) };
}

function teamFor(agent: Agent): string {
	return TEAMS[deal(agent).team]!;
}

type Job = {
	work: Anim;
	/** Heading out to work, and coming back to the castle. */
	out: Anim;
	back: Anim;
	done: Anim;
	idle: Anim;
	/** Draws what the pawn works on, to the right of it on a key. */
	prop(c: Canvas, frame: number): void;
	/** Where the pawn stands on a key while working (tools have different reach). */
	x: number;
};

const JOBS: Job[] = [
	{
		work: "InteractAxe",
		out: "RunAxe",
		back: "RunWood",
		done: "IdleWood",
		idle: "IdleAxe",
		prop: (c, frame) => prop(c, "Tree", 192, frame, TREE, 94, KEY_GROUND, 0.5),
		x: 42,
	},
	{
		work: "InteractPickaxe",
		out: "RunPickaxe",
		back: "RunGold",
		done: "IdleGold",
		idle: "IdlePickaxe",
		prop: (c) => prop(c, "GoldStone", 128, 0, GOLD, 94, KEY_GROUND, 0.75),
		x: 42,
	},
	{
		work: "InteractHammer",
		out: "RunHammer",
		back: "RunHammer",
		done: "IdleHammer",
		idle: "IdleHammer",
		prop: (c) => prop(c, "House_Red", 128, 0, HOUSE, 96, KEY_GROUND + 2, 0.4),
		x: 42,
	},
	{
		work: "InteractKnife",
		out: "RunKnife",
		back: "RunMeat",
		done: "IdleMeat",
		idle: "IdleKnife",
		prop: (c) => {
			prop(c, "Stump", 192, 0, STUMP, 94, KEY_GROUND, 0.75);
			prop(c, "Meat", 64, 0, MEAT, 94, KEY_GROUND - 22, 0.5);
		},
		x: 50,
	},
];

/** Lumberjack, miner, builder or butcher, fixed per workspace. */
function jobFor(agent: Agent): Job {
	return JOBS[deal(agent).job]!;
}

// Pawn sheets: one row of 192px cells. Crop to the area any frame uses; feet sit at y=134, body centre x≈96.
const CROP = { x: 40, y: 50, w: 120, h: 90 };
const FEET = 134 - CROP.y;
const CENTRE = 96 - CROP.x;
const HEAD = 134 - 61;

type PawnOpts = { flip?: boolean; tint?: RGB; alpha?: number };

function pawn(c: Canvas, team: string, anim: Anim, frame: number, cx: number, feet: number, scale: number, opts: PawnOpts = {}): void {
	const png = sheet(`${team}_${anim}`);
	const frames = png.width / 192;
	const centre = opts.flip ? CROP.w - CENTRE : CENTRE;
	c.blitScaled(
		png,
		(frame % frames) * 192 + CROP.x,
		CROP.y,
		CROP.w,
		CROP.h,
		Math.round(cx - centre * scale),
		Math.round(feet - FEET * scale),
		scale,
		opts,
	);
}

/** Draws a single-row sprite sheet frame so that its bottom-centre lands on (cx, base). */
function prop(
	c: Canvas,
	name: string,
	cell: number,
	frame: number,
	box: { x0: number; x1: number; y1: number },
	cx: number,
	base: number,
	scale: number,
	tint?: RGB,
): void {
	const png = sheet(name);
	const frames = Math.max(1, Math.floor(png.width / cell));
	c.blitScaled(
		png,
		(frame % frames) * cell,
		0,
		cell,
		png.height,
		Math.round(cx - ((box.x0 + box.x1) / 2) * scale),
		Math.round(base - box.y1 * scale),
		scale,
		{ tint },
	);
}

const TREE = { x0: 51, x1: 140, y1: 169 };
const GOLD = { x0: 35, x1: 97, y1: 85 };
const CASTLE = { x0: 4, x1: 315, y1: 248 };
const HOUSE = { x0: 8, x1: 119, y1: 172 };
const BUSH = { x0: 31, x1: 97, y1: 78 };
const SHEEP = { x0: 41, x1: 85, y1: 83 };
const STUMP = { x0: 75, x1: 122, y1: 239 };
const MEAT = { x0: 9, x1: 55, y1: 51 };

const GRASS = hex("#5fab62");
const GRASS_LIGHT = hex("#74b363");
const GRASS_DARK = hex("#4f9a56");
const WATER = hex("#47aba9");
const NIGHT_GRASS = hex("#16241c");

const KEY_GROUND = 74;

function keyScene(c: Canvas, agent: Agent): void {
	const idle = isIdle(agent.status);
	const turf = idle ? NIGHT_GRASS : GRASS;
	c.rect(0, 0, SIZE, KEY_GROUND + 2, turf);
	for (let i = 0; i < 9; i++) {
		const h = hash(`${agent.workspace}${i}`);
		c.pattern(["#.#", ".#."], 6 + (h % 104), 8 + ((h >> 8) % 62), 2, { "#": idle ? shade(turf, 1.3) : GRASS_DARK });
	}
	c.rect(0, KEY_GROUND + 2, SIZE, SIZE - KEY_GROUND - 2, THEME[agent.status].bg);
	c.rect(0, KEY_GROUND + 2, SIZE, 2, shade(THEME[agent.status].bg, 0.6));
}

function drawKey(agent: Agent, frame: number): Canvas {
	const c = new Canvas(SIZE, SIZE);
	const team = teamFor(agent);
	const job = jobFor(agent);
	keyScene(c, agent);

	switch (agent.status) {
		case "working":
			job.prop(c, frame);
			pawn(c, team, job.work, frame, job.x, KEY_GROUND, 0.75);
			break;
		case "blocked": {
			const hop = [0, 3, 5, 3][frame % 4]!;
			pawn(c, team, "Idle", frame, 48, KEY_GROUND - hop, 0.75);
			drawBubble(c, 90 + (frame % 2 === 0 ? -1 : 1), 2, BANG, frame % 4 < 2 ? P.red : P.plum);
			break;
		}
		case "done":
			pawn(c, team, job.done, frame, 48, KEY_GROUND, 0.75);
			drawBubble(c, 90, 2, CHECK, P.forest);
			sparkles(c, frame, [
				[82, 34, 0],
				[108, 40, 3],
				[70, 8, 5],
			]);
			break;
		default:
			pawn(c, team, job.idle, Math.floor(frame / 3), 58, KEY_GROUND, 0.75, { tint: [70, 74, 90] });
			break;
	}

	label(c, agent.workspace, THEME[agent.status].text, agent.subtitle);
	frameBorder(c, agent.focused ? P.white : isIdle(agent.status) ? hex("#1a1a20") : shade(THEME[agent.status].bg, 0.7), 3);
	return c;
}

function keyFrame(agent: Agent, frame: number): number {
	switch (agent.status) {
		case "working":
			return frame % 24;
		case "blocked":
		case "done":
			return frame % 8;
		default:
			return Math.floor(frame / 3) % 8;
	}
}

const LIGHT: Record<Period, RGB | null> = {
	day: null,
	dusk: [255, 196, 170],
	night: [96, 110, 170],
};

function tintAll(c: Canvas, [r, g, b]: RGB): void {
	for (let i = 0; i < c.data.length; i += 4) {
		c.data[i] = (c.data[i]! * r) / 255;
		c.data[i + 1] = (c.data[i + 1]! * g) / 255;
		c.data[i + 2] = (c.data[i + 2]! * b) / 255;
	}
}

const SHORE = 30;

function landscape(c: Canvas, sway: number): void {
	c.rect(0, 0, WIDTH, SHORE, WATER);
	for (let i = 0; i < 40; i++) {
		const h = hash(`wave${i}`);
		c.rect(h % WIDTH, 3 + ((h >> 9) % (SHORE - 8)), 4 + (h % 5), 1, hex("#7fd0c8"), 0.7);
	}
	c.rect(0, SHORE, WIDTH, HEIGHT - SHORE, GRASS);
	c.rect(0, SHORE - 2, WIDTH, 2, hex("#d9f2ea"), 0.8);
	c.rect(0, SHORE, WIDTH, 2, GRASS_LIGHT);
	for (let i = 0; i < 90; i++) {
		const h = hash(`tuft${i}`);
		c.pattern(["#.#", ".#."], h % WIDTH, SHORE + 6 + ((h >> 8) % (HEIGHT - SHORE - 8)), 1, { "#": GRASS_DARK });
	}

	prop(c, "Castle", 320, 0, CASTLE, 50, 60, 0.3);
	prop(c, "House_Red", 128, 0, HOUSE, 268, 52, 0.32);
	prop(c, "House_Yellow", 128, 0, HOUSE, 470, 52, 0.32);
	prop(c, "House_Blue", 128, 0, HOUSE, 668, 52, 0.32);
	for (const [x, offset] of [
		[150, 0],
		[205, 3],
		[380, 5],
		[575, 2],
		[612, 6],
	] as const) {
		prop(c, "Tree", 192, sway + offset, TREE, x, 52, 0.34);
	}
	for (const x of [118, 330, 520, 720]) prop(c, "Bush", 128, sway, BUSH, x, 56, 0.35);
	prop(c, "GoldStone", 128, 0, GOLD, 772, 62, 0.5);
}

const skin: Skin = {
	background(hour, frame) {
		const when = period(hour);
		const sway = Math.floor(frame / 2) % 8;
		return {
			key: `${when}:${sway}`,
			draw(c) {
				landscape(c, sway);
				const light = LIGHT[when];
				if (light) tintAll(c, light);
			},
		};
	},
	overlay(c, hour, frame) {
		const light = LIGHT[period(hour)] ?? undefined;
		for (const [x, offset] of [
			[430, 0],
			[700, 5],
		] as const) {
			prop(c, "Sheep", 128, Math.floor(frame / 2) + offset, SHEEP, x, 64, 0.4, light);
		}
	},
	drawActor(c, { agent, x, feet, dir, arrived }, frame) {
		const team = teamFor(agent);
		const job = jobFor(agent);
		const scale = 0.5;
		const flip = dir === (-1 as Facing);
		const hop = agent.status === "blocked" && arrived ? [0, 2, 4, 2][frame % 4]! : 0;
		if (!arrived) {
			pawn(c, team, "Run", frame, x, feet, scale, { flip });
		} else if (agent.status === "working") {
			// Hauls the goods back toward the castle on the left, heads out with the tool to the right.
			pawn(c, team, dir < 0 ? job.back : job.out, frame, x, feet, scale, { flip });
		} else if (agent.status === "blocked") {
			pawn(c, team, "Idle", frame, x, feet - hop, scale, { flip });
		} else if (agent.status === "done") {
			pawn(c, team, job.done, frame, x, feet, scale, { flip });
		} else {
			pawn(c, team, job.idle, Math.floor(frame / 2), x, feet, scale, { flip, tint: [90, 94, 112] });
		}
		return feet - hop - Math.round(HEAD * scale);
	},
};

export const kingdom: Theme = {
	id: "kingdom",
	name: "KINGDOM",
	drawKey,
	keyFrame,
	prepare,
	scene: createScene(skin),
};
