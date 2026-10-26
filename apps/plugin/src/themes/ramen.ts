// Original procedural pixel art; MIT, like Corral. No image sheets or external assets.
import type { Agent } from "../herdr";
import { Canvas, hex, type RGB } from "../pixel";
import { BANG, CHECK, drawBubble, frameBorder, label, P, SIZE, shade, THEME } from "../render";
import { createScene, type Facing, type Period, period, pick, type Skin } from "../scene";
import type { Theme } from "./types";

const INK = hex("#202626");
const CREAM = hex("#fff1d4");
const STEEL = hex("#a9c4bc");
const STEAM = hex("#dbe8d6");
const WOOD = hex("#926345");
const QUESTION = [".###.", "#...#", "...#.", "..#..", "..#..", ".....", "..#.."];
const APRONS: RGB[] = [hex("#e56d50"), hex("#5fc4b0"), hex("#e3b84d"), hex("#a18acb"), hex("#709dd1")];

const CHEF = [
	"....HHH.HHH.....",
	"...HHHHHHHHH....",
	"...HHHHHHHHHH...",
	"....HHHHHHHH....",
	"....hhhhhhhh....",
	"....HHHHHHHH....",
	"....#SSSSSS#....",
	"....#S#SS#S#....",
	"....#SSSSSS#....",
	".....SssSSS.....",
	"....HH#HH#HH....",
	"...HHAHHAHHHH...",
	"...HHAAAAAHHH...",
	"...SSAAAAASSS...",
	"...SsAaaaASsS...",
	"....#ACCCAA#....",
	"....#AAAAAa#....",
	"....#AAAAAa#....",
	"....########....",
	".....##..##.....",
	".....##..##.....",
	"....###..###....",
];
const POT = [
	".....#######.....",
	"....#TTTTTTT#....",
	"..#############..",
	".#TTTTTTTTTTTTT#.",
	"#T#TTTTTTTTTTT#T#",
	"#t#TThhTTTTTTT#t#",
	".##TThhTTTTTtt##.",
	"..#TTTTTTTTttt#..",
	"..#TTTTTTTTttt#..",
	"...#ttttttttt#...",
	"....#########....",
];
const VAPOUR = [".#...#..", "#...#...", ".#...#..", "..#...#.", ".#...#..", "#...#..."];
const RECIPE = [
	".######.######.",
	"#pppppp#pppppp#",
	"#pLLLpp#pLLLpp#",
	"#pppppp#pppppp#",
	"#pLLppp#pLLLpp#",
	"#pppppp#pppppp#",
	"#pLLLpp#pLLppp#",
	"#pppppp#pppppp#",
	"#pppppp#pppppp#",
	".######b######.",
	".bbbbbbbbbbbbb.",
];

function recipe(c: Canvas, cx: number, feet: number, scale: number): void {
	c.pattern(RECIPE, cx - 7.5 * scale, feet - RECIPE.length * scale, scale, {
		"#": INK, p: hex("#f2d28f"), L: WOOD, b: hex("#b04c41"),
	});
}

function bowl(c: Canvas, cx: number, feet: number, scale: number): void {
	c.pattern([
		".........GG....", "....NNNNNGGN...", "..#NNNENNNNN#..", ".#NNENNNENNNN#.",
		"#CCCCCCCCCCCCC#", "#CHHHHHHHHHHHC#", ".#CHHHHHHHHHC#.", "..#CHHHHHHHC#..",
		"...#CHHHHHC#...", "....#######....", ".....#####.....",
	], cx - 7.5 * scale, feet - 11 * scale, scale, {
		"#": INK, C: hex("#c7c7ab"), H: CREAM, N: hex("#e7a63e"), E: CREAM, G: hex("#4c844c"),
	});
}

function utensils(c: Canvas, cx: number, feet: number, scale: number): void {
	c.pattern([
		"..TT..T.T..", ".TTTT.T.T..", "..TT..T.T..", "..T...T.T..", "..T...T.T..",
		"..T...T.T..", "..T...T.T..", "..T...T.T..", ".#########.", ".#bbbbbbb#.",
		".#bbHHHbb#.", ".#bbbbbbb#.", "..#bbbbb#..", "..#bbbbb#..", "...#####...",
	], cx - 5.5 * scale, feet - 15 * scale, scale, { "#": INK, T: STEEL, b: hex("#b04c41"), H: CREAM });
}

function apron(agent: Agent): RGB {
	// identity remains canonical in Showcase; external labels are never sprite text.
	return APRONS[pick(`ramen:apron:${agent.identity}`, APRONS.length)]!;
}

function cook(c: Canvas, agent: Agent, cx: number, feet: number, scale: number, dir: Facing = 1): number {
	const top = feet - CHEF.length * scale;
	const colour = apron(agent);
	const rows = dir < 0 ? CHEF.map((row) => [...row].reverse().join("")) : CHEF;
	c.pattern(rows, cx - 8 * scale, top, scale, {
		"#": INK, H: CREAM, h: hex("#c7c7ab"), S: hex("#e9b080"), s: hex("#b97e58"),
		A: colour, a: shade(colour, 0.7), C: CREAM,
	});
	return top;
}

function stockpot(c: Canvas, cx: number, feet: number, scale: number, frame: number): void {
	const x = cx - 8.5 * scale;
	c.pattern(POT, x, feet - POT.length * scale, scale, { "#": INK, T: STEEL, t: hex("#51736c"), h: CREAM });
	const drift = [0, 1, 0, -1][frame % 4]!;
	c.pattern(VAPOUR, x + (3 + drift) * scale, feet - 19 * scale, scale, { "#": STEAM });
}

function kitchen(c: Canvas, when: Period = "day"): void {
	const wall = { day: hex("#254741"), dusk: hex("#493e3a"), night: hex("#182e32") }[when];
	const grout = { day: hex("#335b52"), dusk: hex("#645044"), night: hex("#284247") }[when];
	c.rect(0, 0, c.width, c.height, wall);
	for (let y = 10; y < 68; y += 14) {
		c.rect(0, y, c.width, 1, grout);
		for (let x = (y % 28 === 10 ? 0 : 12); x < c.width; x += 24) c.rect(x, y, 1, 14, grout);
	}
	// Bowls, a herb jar and amber pendant lamps: readable architecture, not fake order counters.
	for (let x = c.width === SIZE ? 62 : 144; x < c.width - 24; x += 200) {
		c.rect(x - 4, 32, 40, 3, WOOD);
		c.pattern(["HHHHHHH", ".HHHHH.", "..HHH.."], x, 26, 1, { H: CREAM });
		c.pattern([".G.G.", "..G..", ".GGG.", ".bbb.", ".bbb."], x + 21, 27, 1, { G: hex("#4c844c"), b: hex("#b04c41") });
		c.rect(x + 12, 0, 1, 12, INK);
		c.pattern(["..###..", ".#####.", "#######", ".LLLLL."], x + 9, 12, 1, { "#": WOOD, L: hex(when === "day" ? "#d2ac68" : "#ffd08a") });
	}
	c.rect(0, 68, c.width, 4, hex("#c99961"));
	c.rect(0, 72, c.width, 4, WOOD);
	c.rect(0, 76, c.width, c.height - 76, hex("#323a38"));
	for (let y = 77; y < c.height; y += 12)
		for (let x = 0; x < c.width; x += 16)
			c.rect(x, y, 15, 11, shade(hex("#626659"), (x / 16 + (y - 77) / 12) % 2 === 0 ? 0.8 : 0.55));
}

function drawKey(agent: Agent, frame: number): Canvas {
	const c = new Canvas(SIZE, SIZE);
	kitchen(c);
	c.rect(0, 76, SIZE, SIZE - 76, THEME[agent.status].bg);
	cook(c, agent, 38, 72, 2);
	if (agent.status === "working") {
		c.rect(52, 58, 16, 4, hex("#e9b080"));
		stockpot(c, 81, 72, 2, frame);
	} else if (agent.status === "blocked") {
		recipe(c, 81, 72, 2);
		drawBubble(c, 90, 4, BANG, P.red);
	} else if (agent.status === "done") {
		bowl(c, 81, 72, 2);
		drawBubble(c, 90, 4, CHECK, P.forest);
	} else {
		utensils(c, 81, 72, 2);
		if (agent.status === "unknown") drawBubble(c, 90, 4, QUESTION, P.silver);
	}
	label(c, agent.workspace, THEME[agent.status].text, agent.subtitle, frame);
	frameBorder(c, agent.focused ? P.white : shade(THEME[agent.status].bg, 0.7), 3);
	return c;
}

const skin: Skin = {
	background(hour) {
		const when = period(hour);
		return { key: `kitchen:${when}`, draw: (c) => kitchen(c, when) };
	},
	drawActor(c, { agent, x, feet, dir, arrived }, frame) {
		// Keep the entire silhouette above the shared Showcase footer (y=89).
		const base = Math.min(feet, 88) - ((!arrived || agent.status === "working") ? frame % 2 : 0);
		const head = cook(c, agent, x, base, 2, dir);
		const propX = x + dir * 34;
		if (agent.status === "working") {
			c.rect(dir > 0 ? x + 14 : x - 26, base - 14, 12, 4, hex("#e9b080"));
			stockpot(c, propX, base, 2, frame);
		} else if (agent.status === "blocked") {
			recipe(c, propX, base, 2);
		} else if (agent.status === "done") {
			bowl(c, propX, base, 2);
		} else {
			utensils(c, propX, base, 2);
			// Put the question beside the stored tools, below either shared tag row.
			if (agent.status === "unknown") c.pattern(QUESTION, propX + (dir > 0 ? 14 : -24), base - 36, 2, { "#": P.silver });
		}
		return head;
	},
};

export const ramen: Theme = {
	id: "ramen", name: "RAMEN / COCINA", drawKey,
	keyFrame: (agent, frame) => agent.status === "working" ? frame % 4 : 0,
	scene: createScene(skin),
};
