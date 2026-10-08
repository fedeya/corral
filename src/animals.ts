import type { PNG } from "pngjs";
import { type Canvas, loadSheet, type RGB } from "./pixel";

export type Facing = 1 | -1;
export type Mode = "walk" | "eat";

type Sheet = { png: PNG; cell: number; rowOffset: number };
type Box = { x0: number; y0: number; x1: number; y1: number };

export type Animal = {
	name: string;
	scale: number;
	/** Sheet has left/right rows swapped compared to the LPC convention. */
	mirrored: boolean;
	sheets: Record<Mode, Sheet>;
	/** Union bounding box per mode+facing (cell coordinates), so frames never jitter. */
	boxes: Record<string, Box>;
	/** Anchor (centre x, feet y) taken from the walk cycle, shared by both modes. */
	anchors: Record<Facing, { cx: number; feet: number }>;
};

// LPC sheets: rows are up, left, down, right.
const ROW: Record<Facing, number> = { 1: 3, [-1]: 1 };

function bounds(sheet: Sheet, row: number): Box {
	const box = { x0: sheet.cell, y0: sheet.cell, x1: -1, y1: -1 };
	for (let col = 0; col < 4; col++) {
		for (let y = 0; y < sheet.cell; y++) {
			for (let x = 0; x < sheet.cell; x++) {
				const i = ((row * sheet.cell + y) * sheet.png.width + col * sheet.cell + x) * 4;
				if (sheet.png.data[i + 3]! === 0) continue;
				box.x0 = Math.min(box.x0, x);
				box.x1 = Math.max(box.x1, x);
				box.y0 = Math.min(box.y0, y);
				box.y1 = Math.max(box.y1, y);
			}
		}
	}
	return box;
}

function rowFor(a: { mirrored: boolean }, facing: Facing): number {
	return ROW[a.mirrored ? (-facing as Facing) : facing];
}

function animal(name: string, walk: Sheet, eat: Sheet, scale = 1, mirrored = false): Animal {
	const sheets = { walk, eat };
	const boxes: Record<string, Box> = {};
	for (const mode of ["walk", "eat"] as const) {
		for (const facing of [1, -1] as const) {
			const sheet = sheets[mode];
			boxes[`${mode}${facing}`] = bounds(sheet, sheet.rowOffset + rowFor({ mirrored }, facing));
		}
	}
	const anchor = (facing: Facing) => {
		const box = boxes[`walk${facing}`]!;
		return { cx: (box.x0 + box.x1) / 2, feet: box.y1 };
	};
	return { name, scale, mirrored, sheets, boxes, anchors: { 1: anchor(1), [-1]: anchor(-1) } };
}

function pair(name: string, cell: number, scale = 1, mirrored = false): Animal {
	return animal(
		name,
		{ png: loadSheet(`${name}_walk.png`), cell, rowOffset: 0 },
		{ png: loadSheet(`${name}_eat.png`), cell, rowOffset: 0 },
		scale,
		mirrored,
	);
}

const goatSheet = loadSheet("goat-sheet.png");

export const ANIMALS: Animal[] = [
	animal("goat", { png: goatSheet, cell: 128, rowOffset: 0 }, { png: goatSheet, cell: 128, rowOffset: 4 }),
	pair("sheep", 128),
	pair("cow", 128),
	pair("pig", 128),
	pair("llama", 128, 1, true),
	pair("chicken", 32, 2),
];

function hash(text: string): number {
	let h = 2166136261;
	for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return h >>> 0;
}

// Light coat variations so repeated species still look like different animals.
const COATS: RGB[] = [
	[255, 255, 255],
	[255, 222, 186],
	[200, 204, 232],
];

export type Critter = { animal: Animal; coat: RGB };

export function critterFor(key: string): Critter {
	const h = hash(key);
	return { animal: ANIMALS[h % ANIMALS.length]!, coat: COATS[Math.floor(h / ANIMALS.length) % COATS.length]! };
}

export function dim(coat: RGB, factor: number): RGB {
	return [coat[0] * factor, coat[1] * factor, coat[2] * factor];
}

export function drawAnimal(
	c: Canvas,
	a: Animal,
	mode: Mode,
	facing: Facing,
	frame: number,
	cx: number,
	feet: number,
	tint?: RGB,
): void {
	const sheet = a.sheets[mode];
	const box = a.boxes[`${mode}${facing}`]!;
	const anchor = a.anchors[facing];
	const row = sheet.rowOffset + rowFor(a, facing);
	c.blit(
		sheet.png,
		(frame % 4) * sheet.cell + box.x0,
		row * sheet.cell + box.y0,
		box.x1 - box.x0 + 1,
		box.y1 - box.y0 + 1,
		Math.round(cx - (anchor.cx - box.x0) * a.scale),
		Math.round(feet - (anchor.feet - box.y0 + 1) * a.scale),
		1,
		tint,
		a.scale,
	);
}

export function animalHeight(a: Animal, facing: Facing): number {
	const box = a.boxes[`walk${facing}`]!;
	return (a.anchors[facing].feet - box.y0 + 1) * a.scale;
}
