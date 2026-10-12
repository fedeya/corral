import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PNG } from "pngjs";

export type RGB = readonly [number, number, number];

export function hex(value: string): RGB {
	const n = Number.parseInt(value.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class Canvas {
	readonly data: Buffer;

	constructor(
		readonly width: number,
		readonly height: number,
	) {
		this.data = Buffer.alloc(width * height * 4);
	}

	set(x: number, y: number, [r, g, b]: RGB, alpha = 1): void {
		x = Math.round(x);
		y = Math.round(y);
		if (x < 0 || y < 0 || x >= this.width || y >= this.height || alpha <= 0) return;
		const i = (y * this.width + x) * 4;
		const a = Math.min(1, alpha);
		this.data[i] = Math.round(r * a + this.data[i]! * (1 - a));
		this.data[i + 1] = Math.round(g * a + this.data[i + 1]! * (1 - a));
		this.data[i + 2] = Math.round(b * a + this.data[i + 2]! * (1 - a));
		this.data[i + 3] = 255;
	}

	rect(x: number, y: number, w: number, h: number, color: RGB, alpha = 1): void {
		for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) this.set(x + dx, y + dy, color, alpha);
	}

	/** Draws a pattern of '#' (and optional extra palette chars) at the given pixel scale. */
	pattern(rows: readonly string[], x: number, y: number, scale: number, palette: Record<string, RGB>): void {
		rows.forEach((row, r) => {
			[...row].forEach((ch, c) => {
				const color = palette[ch];
				if (color) this.rect(x + c * scale, y + r * scale, scale, scale, color);
			});
		});
	}

	blit(
		sheet: PNG,
		sx: number,
		sy: number,
		w: number,
		h: number,
		dx: number,
		dy: number,
		alpha = 1,
		tint: RGB = [255, 255, 255],
		scale = 1,
	): void {
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const i = ((sy + y) * sheet.width + sx + x) * 4;
				const a = (sheet.data[i + 3]! / 255) * alpha;
				if (a <= 0) continue;
				const color: RGB = [
					(sheet.data[i]! * tint[0]) / 255,
					(sheet.data[i + 1]! * tint[1]) / 255,
					(sheet.data[i + 2]! * tint[2]) / 255,
				];
				for (let oy = 0; oy < scale; oy++)
					for (let ox = 0; ox < scale; ox++) this.set(dx + x * scale + ox, dy + y * scale + oy, color, a);
			}
		}
	}

	/** Nearest-neighbour blit at any scale (including < 1), optionally mirrored horizontally. */
	blitScaled(
		sheet: PNG,
		sx: number,
		sy: number,
		w: number,
		h: number,
		dx: number,
		dy: number,
		scale: number,
		opts: { alpha?: number; tint?: RGB; flip?: boolean } = {},
	): void {
		const { alpha = 1, tint = [255, 255, 255], flip = false } = opts;
		const dw = Math.round(w * scale);
		const dh = Math.round(h * scale);
		for (let y = 0; y < dh; y++) {
			const py = dy + y;
			if (py < 0 || py >= this.height) continue;
			const row = (sy + Math.min(h - 1, Math.floor(y / scale))) * sheet.width;
			for (let x = 0; x < dw; x++) {
				const px = dx + x;
				if (px < 0 || px >= this.width) continue;
				const fx = Math.min(w - 1, Math.floor(x / scale));
				const i = (row + sx + (flip ? w - 1 - fx : fx)) * 4;
				const a = (sheet.data[i + 3]! / 255) * alpha;
				if (a <= 0) continue;
				this.set(px, py, [(sheet.data[i]! * tint[0]) / 255, (sheet.data[i + 1]! * tint[1]) / 255, (sheet.data[i + 2]! * tint[2]) / 255], a);
			}
		}
	}

	crop(x: number, y: number, w: number, h: number): Canvas {
		const out = new Canvas(w, h);
		for (let row = 0; row < h; row++) {
			const start = ((y + row) * this.width + x) * 4;
			this.data.copy(out.data, row * w * 4, start, start + w * 4);
		}
		return out;
	}

	toDataUrl(): string {
		const png = new PNG({ width: this.width, height: this.height });
		this.data.copy(png.data);
		return `data:image/png;base64,${PNG.sync.write(png, { deflateLevel: 1, filterType: 0 }).toString("base64")}`;
	}
}

const IMGS = process.env.CORRAL_IMGS ?? join(dirname(process.argv[1] ?? "."), "../imgs");

export function loadSheet(name: string): PNG {
	return PNG.sync.read(readFileSync(join(IMGS, name)));
}

export function hasImage(name: string): boolean {
	return existsSync(join(IMGS, name));
}

export type Font = Record<string, string[]>;

// Bitmap fonts with per-glyph widths for proportional spacing.
export const FONT_5X7: Font = {
	A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
	B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
	C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
	D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
	E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
	F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
	G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
	H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
	I: ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
	J: ["..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##.."],
	K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
	L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
	M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
	N: ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
	O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
	P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
	Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
	R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
	S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
	T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
	U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
	V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
	W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
	X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
	Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
	Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
	"0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
	"1": [".#.", "##.", ".#.", ".#.", ".#.", ".#.", "###"],
	"2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
	"3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
	"4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
	"5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
	"6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
	"7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
	"8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
	"9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
	"-": ["...", "...", "...", "###", "...", "...", "..."],
	".": [".", ".", ".", ".", ".", ".", "#"],
	"/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
	_: ["....", "....", "....", "....", "....", "....", "####"],
	"!": ["#", "#", "#", "#", "#", ".", "#"],
	"?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
	":": [".", "#", ".", ".", ".", "#", "."],
	" ": ["..", "..", "..", "..", "..", "..", ".."],
};

export const FONT_3X5: Font = {
	A: [".#.", "#.#", "###", "#.#", "#.#"],
	B: ["##.", "#.#", "##.", "#.#", "##."],
	C: [".##", "#..", "#..", "#..", ".##"],
	D: ["##.", "#.#", "#.#", "#.#", "##."],
	E: ["###", "#..", "##.", "#..", "###"],
	F: ["###", "#..", "##.", "#..", "#.."],
	G: [".##", "#..", "#.#", "#.#", ".##"],
	H: ["#.#", "#.#", "###", "#.#", "#.#"],
	I: ["###", ".#.", ".#.", ".#.", "###"],
	J: ["..#", "..#", "..#", "#.#", ".#."],
	K: ["#.#", "#.#", "##.", "#.#", "#.#"],
	L: ["#..", "#..", "#..", "#..", "###"],
	M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
	N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
	O: [".#.", "#.#", "#.#", "#.#", ".#."],
	P: ["##.", "#.#", "##.", "#..", "#.."],
	Q: [".#.", "#.#", "#.#", "##.", ".##"],
	R: ["##.", "#.#", "##.", "#.#", "#.#"],
	S: [".##", "#..", ".#.", "..#", "##."],
	T: ["###", ".#.", ".#.", ".#.", ".#."],
	U: ["#.#", "#.#", "#.#", "#.#", "###"],
	V: ["#.#", "#.#", "#.#", "#.#", ".#."],
	W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
	X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
	Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
	Z: ["###", "..#", ".#.", "#..", "###"],
	"0": ["###", "#.#", "#.#", "#.#", "###"],
	"1": [".#.", "##.", ".#.", ".#.", "###"],
	"2": ["##.", "..#", ".#.", "#..", "###"],
	"3": ["##.", "..#", ".#.", "..#", "##."],
	"4": ["#.#", "#.#", "###", "..#", "..#"],
	"5": ["###", "#..", "##.", "..#", "##."],
	"6": [".##", "#..", "###", "#.#", "###"],
	"7": ["###", "..#", ".#.", ".#.", ".#."],
	"8": ["###", "#.#", "###", "#.#", "###"],
	"9": ["###", "#.#", "###", "..#", "##."],
	"-": ["..", "..", "##", "..", ".."],
	".": [".", ".", ".", ".", "#"],
	"/": ["..#", "..#", ".#.", "#..", "#.."],
	_: ["...", "...", "...", "...", "###"],
	"!": ["#", "#", "#", ".", "#"],
	"?": ["##.", "..#", ".#.", "...", ".#."],
	":": [".", "#", ".", "#", "."],
	" ": ["..", "..", "..", "..", ".."],
	"✓": ["....#", "...#.", "#.#..", ".#...", "....."],
};

function glyph(ch: string, font: Font): string[] {
	if (font[ch]) return font[ch]!;
	const plain = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
	return font[plain] ?? font["?"]!;
}

export function textWidth(text: string, scale: number, font: Font = FONT_5X7): number {
	return [...text].reduce((w, ch, i) => w + (glyph(ch, font)[0]!.length + (i > 0 ? 1 : 0)) * scale, 0);
}

export function drawText(
	canvas: Canvas,
	text: string,
	x: number,
	y: number,
	scale: number,
	color: RGB,
	shadow?: RGB,
	font: Font = FONT_5X7,
): void {
	let cx = x;
	for (const ch of text) {
		const rows = glyph(ch, font);
		if (shadow) canvas.pattern(rows, cx + 1, y + 1, scale, { "#": shadow });
		canvas.pattern(rows, cx, y, scale, { "#": color });
		cx += (rows[0]!.length + 1) * scale;
	}
}

export function drawTextCentered(
	canvas: Canvas,
	text: string,
	y: number,
	scale: number,
	color: RGB,
	shadow?: RGB,
	font: Font = FONT_5X7,
): void {
	drawText(canvas, text, Math.round((canvas.width - textWidth(text, scale, font)) / 2), y, scale, color, shadow, font);
}

/** Single line, cut with ".." if it doesn't fit. */
export function fitText(text: string, maxWidth: number, scale: number, font: Font = FONT_5X7): string {
	if (textWidth(text, scale, font) <= maxWidth) return text;
	let cut = text;
	while (cut.length > 1 && textWidth(`${cut}..`, scale, font) > maxWidth) cut = cut.slice(0, -1);
	return `${cut.trimEnd()}..`;
}

/** Wraps on '-', '/', '_' and spaces, keeping the separator at the end of the line. */
export function wrapPixels(text: string, maxWidth: number, scale: number, maxLines: number, font: Font = FONT_5X7): string[] {
	const tokens = text.match(/[^-/_\s]+[-/_\s]?|[-/_\s]/g) ?? [];
	const lines: string[] = [];
	let line = "";
	for (const token of tokens) {
		const next = line + token;
		if (textWidth(next.trimEnd(), scale, font) <= maxWidth) {
			line = next;
			continue;
		}
		if (line) lines.push(line.trimEnd());
		line = token;
		while (textWidth(line.trimEnd(), scale, font) > maxWidth) {
			let cut = line.length - 1;
			while (cut > 1 && textWidth(line.slice(0, cut), scale, font) > maxWidth) cut--;
			lines.push(line.slice(0, cut));
			line = line.slice(cut);
		}
	}
	if (line.trim()) lines.push(line.trimEnd());
	if (lines.length > maxLines) {
		const kept = lines.slice(0, maxLines);
		let last = kept[maxLines - 1]!;
		while (last && textWidth(`${last}..`, scale, font) > maxWidth) last = last.slice(0, -1);
		kept[maxLines - 1] = `${last.replace(/[-/_\s]$/, "")}..`;
		return kept;
	}
	return lines;
}
