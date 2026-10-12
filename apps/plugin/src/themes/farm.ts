import { animalHeight, critterFor, dim, drawAnimal } from "../animals";
import type { Agent } from "../herdr";
import { Canvas, hex, type RGB } from "../pixel";
import {
	BANG,
	CHECK,
	drawBubble,
	frameBorder,
	isIdle,
	label,
	P,
	SIZE,
	shade,
	sparkles,
	THEME,
} from "../render";
import { createScene, HEIGHT, hash, type Period, period, type Skin, WIDTH } from "../scene";
import type { Theme } from "./types";

const TUFT = ["#.#", ".#."];
const GRAZE = [0, 0, 1, 2, 3, 2, 3, 2, 1, 0, 0, 0];

function ground(c: Canvas, bg: RGB): void {
	c.rect(4, 64, SIZE - 8, 3, shade(bg, 0.6));
}

function grass(c: Canvas, scroll: number, color: RGB = P.green): void {
	for (let i = 0; i < 6; i++) {
		const x = 8 + ((((i * 19 - scroll) % 104) + 104) % 104);
		c.pattern(TUFT, x, 61, 2, { "#": color });
	}
}

function drawKey(agent: Agent, frame: number): Canvas {
	const c = new Canvas(SIZE, SIZE);
	const theme = THEME[agent.status];
	c.rect(0, 0, SIZE, SIZE, theme.bg);
	frameBorder(c, isIdle(agent.status) ? hex("#1a1a20") : shade(theme.bg, 0.7), 3);

	const { animal, coat } = critterFor(agent.identity);
	ground(c, theme.bg);
	switch (agent.status) {
		case "working":
			drawAnimal(c, animal, "walk", 1, frame, 58, 66, coat);
			grass(c, frame * 3);
			break;
		case "blocked": {
			const hop = [0, 3, 5, 3][frame % 4]!;
			drawAnimal(c, animal, "walk", 1, 0, 50, 66 - hop, coat);
			grass(c, 0);
			drawBubble(c, 92 + (frame % 2 === 0 ? -1 : 1), 2, BANG, frame % 4 < 2 ? P.red : P.plum);
			break;
		}
		case "done":
			drawAnimal(c, animal, "eat", 1, 0, 50, 66, coat);
			grass(c, 0);
			drawBubble(c, 92, 2, CHECK, P.forest);
			sparkles(c, frame, [
				[84, 30, 0],
				[112, 32, 3],
				[88, 4, 5],
			]);
			break;
		default:
			drawAnimal(c, animal, "eat", 1, GRAZE[Math.floor(frame / 4) % GRAZE.length]!, 58, 66, dim(coat, 0.4));
			grass(c, 0, hex("#1f3326"));
			break;
	}

	label(c, agent.workspace, theme.text, agent.subtitle);
	if (agent.focused) frameBorder(c, P.white, 3);
	return c;
}

function keyFrame(agent: Agent, frame: number): number {
	switch (agent.status) {
		case "working":
			return frame % 36;
		case "blocked":
			return frame % 4;
		case "done":
			return frame % 8;
		default:
			return Math.floor(frame / 4) % GRAZE.length;
	}
}

const SKY: Record<Period, RGB[]> = {
	day: ["#3a7fc4", "#4b91d1", "#5fa3dc", "#77b6e6", "#93c8ee"].map(hex),
	dusk: ["#2c2452", "#4a2c63", "#7a3d6b", "#b4566b", "#e07f62"].map(hex),
	night: ["#070a1c", "#0b1029", "#101736", "#162043", "#1d2b53"].map(hex),
};
const HILLS: Record<Period, RGB> = { day: hex("#3f8f4a"), dusk: hex("#3b4a4a"), night: hex("#14283a") };
const GRASS: Record<Period, RGB> = { day: hex("#2f8a3e"), dusk: hex("#2a5e3a"), night: hex("#123524") };
const WOOD: Record<Period, RGB> = { day: hex("#8a5a3a"), dusk: hex("#6a4436"), night: hex("#3e2a24") };

const SUN = ["..####..", ".######.", "########", "########", "########", "########", ".######.", "..####.."];
const MOON = ["..###...", ".####...", "####....", "###.....", "###.....", "####....", ".####...", "..###..."];
const CLOUD = ["....####......", "..########....", ".############.", "##############", ".############."];

function sky(c: Canvas, when: Period, frame: number): void {
	SKY[when].forEach((color, i) => c.rect(0, i * 12, WIDTH, 12, color));
	if (when === "night") {
		for (let i = 0; i < 45; i++) {
			const h = hash(`star${i}`);
			const twinkle = (frame + (h % 16)) % 16 < 12;
			if (twinkle) c.rect(h % WIDTH, (h >> 10) % 44, 1, 1, P.white, 0.4 + ((h >> 4) % 6) / 10);
		}
		c.pattern(MOON, 24, 6, 2, { "#": hex("#fff1c4") });
	} else {
		c.pattern(SUN, 24, when === "day" ? 6 : 26, 2, { "#": when === "day" ? hex("#ffe27a") : hex("#ffb35c") });
	}
}

function scenery(c: Canvas, when: Period): void {
	const hills = HILLS[when];
	for (let x = 0; x < WIDTH; x++) {
		const h = 6 + Math.round(5 * Math.sin(x / 47) + 3 * Math.sin(x / 19 + 1));
		c.rect(x, 58 - h, 1, h + 2, hills);
	}
	const turf = GRASS[when];
	c.rect(0, 60, WIDTH, HEIGHT - 60, turf);
	c.rect(0, 60, WIDTH, 2, shade(turf, 1.25));
	const wood = WOOD[when];
	for (const y of [49, 55]) {
		c.rect(0, y, WIDTH, 2, wood);
		c.rect(0, y, WIDTH, 1, shade(wood, 1.3));
	}
	for (let x = 12; x < WIDTH; x += 48) {
		c.rect(x, 45, 4, 16, wood);
		c.rect(x, 45, 1, 16, shade(wood, 1.3));
	}
	for (let i = 0; i < 70; i++) {
		const h = hash(`tuft${i}`);
		c.pattern(TUFT, h % WIDTH, 65 + ((h >> 8) % 33), 1, { "#": shade(turf, 1.45) });
	}
}

const skin: Skin = {
	background(hour, frame) {
		const when = period(hour);
		const twinkle = when === "night" ? frame % 16 : 0;
		return {
			key: `${when}:${twinkle}`,
			draw(c) {
				sky(c, when, twinkle);
				scenery(c, when);
			},
		};
	},
	overlay(c, hour, frame) {
		const when = period(hour);
		if (when === "night") return;
		const color = when === "day" ? hex("#eef6ff") : hex("#f0b8a0");
		for (let i = 0; i < 4; i++) {
			const h = hash(`cloud${i}`);
			const x = (((h % (WIDTH + 120)) + Math.floor(frame / 3)) % (WIDTH + 120)) - 60;
			c.pattern(CLOUD, x, 4 + ((h >> 12) % 22), 2, { "#": color });
		}
	},
	drawActor(c, { agent, x, feet, dir, arrived, seed }, frame) {
		const { animal, coat } = critterFor(agent.identity);
		const tint = isIdle(agent.status) ? dim(coat, 0.4) : coat;
		const hop = agent.status === "blocked" && arrived ? [0, 3, 5, 3][frame % 4]! : 0;
		if (!arrived || agent.status === "working") {
			drawAnimal(c, animal, "walk", dir, frame, x, feet, tint);
		} else if (agent.status === "blocked") {
			drawAnimal(c, animal, "walk", dir, 0, x, feet - hop, tint);
		} else if (agent.status === "done") {
			drawAnimal(c, animal, "eat", dir, 0, x, feet, tint);
		} else {
			const graze = GRAZE[Math.floor((frame + (seed % 12)) / 2) % GRAZE.length]!;
			drawAnimal(c, animal, "eat", dir, graze, x, feet, tint);
		}
		return feet - hop - animalHeight(animal, dir);
	},
};

export const farm: Theme = {
	id: "farm",
	name: "FARM",
	drawKey,
	keyFrame,
	scene: createScene(skin),
};
