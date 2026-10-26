import type { AgentStatus } from "./herdr";
import {
	type Canvas,
	drawText,
	drawTextCentered,
	drawTextScrolling,
	FONT_3X5,
	hex,
	type RGB,
	textWidth,
	wrapPixels,
} from "./pixel";

// PICO-8 palette
export const P = {
	black: hex("#000000"),
	navy: hex("#1d2b53"),
	plum: hex("#7e2553"),
	forest: hex("#008751"),
	brown: hex("#ab5236"),
	slate: hex("#5f574f"),
	silver: hex("#c2c3c7"),
	white: hex("#fff1e8"),
	red: hex("#ff004d"),
	orange: hex("#ffa300"),
	yellow: hex("#ffec27"),
	green: hex("#00e436"),
};

export const THEME: Record<AgentStatus, { bg: RGB; accent: RGB; text: RGB }> = {
	blocked: { bg: P.plum, accent: P.red, text: P.white },
	done: { bg: P.forest, accent: P.green, text: P.white },
	working: { bg: P.brown, accent: P.orange, text: P.white },
	idle: { bg: hex("#0e0e12"), accent: P.slate, text: P.slate },
	unknown: { bg: hex("#0e0e12"), accent: P.slate, text: P.slate },
};

export const SIZE = 120;

/** Small camera badge; fixed text only, on every key/strip segment. */
export function showcaseMarker(c: Canvas, x = 0, y = 106, width = SIZE): void {
	c.rect(x + 3, y, width - 6, 13, P.black);
	c.rect(x + 7, y + 2, 9, 6, P.yellow);
	c.rect(x + 16, y + 1, 3, 8, P.yellow);
	drawText(c, "SHOWCASE", x + Math.round((width - textWidth("SHOWCASE", 2, FONT_3X5)) / 2), y + 1, 2, P.yellow, undefined, FONT_3X5);
}

export function shade([r, g, b]: RGB, f: number): RGB {
	return [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
}

export function isIdle(status: AgentStatus): boolean {
	return status === "idle" || status === "unknown";
}

const BUBBLE = [
	".##########.",
	"#WWWWWWWWWW#",
	"#WWWWWWWWWW#",
	"#WWWWWWWWWW#",
	"#WWWWWWWWWW#",
	"#WWWWWWWWWW#",
	"#WWWWWWWWWW#",
	"#WWWWWWWWWW#",
	"#WWWWWWWWWW#",
	".###.######.",
	"..#W#.......",
	".#W#........",
	".##.........",
];
export const BANG = ["##", "##", "##", "##", "##", "..", "##"];
export const CHECK = [".....##", "....##.", "##.##..", ".###...", "..#...."];
export const SPARKLE = [".#.", "###", ".#."];

/** Speech bubble (24x26) with its tail at the bottom-left. */
export function drawBubble(c: Canvas, x: number, y: number, icon: string[], color: RGB): void {
	c.pattern(BUBBLE, x, y, 2, { "#": P.black, W: P.white });
	const w = icon[0]!.length * 2;
	const h = icon.length * 2;
	c.pattern(icon, x + 1 + Math.round((22 - w) / 2), y + 1 + Math.round((16 - h) / 2), 2, { "#": color });
}

export function sparkles(c: Canvas, frame: number, spots: [number, number, number][]): void {
	for (const [x, y, offset] of spots) {
		if ((frame + offset) % 8 < 4) c.pattern(SPARKLE, x, y, 2, { "#": P.yellow });
	}
}

const LABEL_WIDTH = SIZE - 14;
const MARQUEE_PAUSE = 16;
const MARQUEE_STEP = 4;
const MARQUEE_GAP = 24;

const oneLine = (s: string) => textWidth(s, 2, FONT_3X5) <= LABEL_WIDTH;
/** Fits in two lines without splitting a word across them. */
const twoLines = (s: string) =>
	(s.match(/[^-/_\s]+/g) ?? []).every(oneLine) &&
	wrapPixels(s, LABEL_WIDTH, 2, Number.POSITIVE_INFINITY, FONT_3X5).length <= 2;

/** Frames needed to scroll a line a full lap, or 0 when it fits. */
function scrollSteps(text: string): number {
	return oneLine(text) ? 0 : Math.ceil((textWidth(text, 2, FONT_3X5) + MARQUEE_GAP) / MARQUEE_STEP);
}

/** Without a subtitle the workspace wraps to two lines; it only scrolls when two whole-word lines aren't enough. */
function titleScrolls(text: string, subtitle?: string): boolean {
	return subtitle ? !oneLine(text) : !twoLines(text);
}

/**
 * Scroll offsets (px) of the workspace and subtitle lines at `frame`. Lines that don't fit take turns in a loop: each
 * holds at its start long enough to read, then scrolls a full lap while the other waits, so only one line moves.
 */
export function labelOffsets(text: string, subtitle: string | undefined, frame: number): [number, number] {
	const turns = [titleScrolls(text, subtitle) ? scrollSteps(text) : 0, subtitle ? scrollSteps(subtitle) : 0];
	const cycle = turns.reduce((sum, steps) => sum + (steps ? MARQUEE_PAUSE + steps : 0), 0);
	const offsets: [number, number] = [0, 0];
	if (!cycle) return offsets;
	let t = frame % cycle;
	for (const [i, steps] of turns.entries()) {
		if (!steps) continue;
		if (t < MARQUEE_PAUSE + steps) {
			offsets[i] = Math.max(0, t - MARQUEE_PAUSE) * MARQUEE_STEP;
			break;
		}
		t -= MARQUEE_PAUSE + steps;
	}
	return offsets;
}

function line(c: Canvas, text: string, y: number, color: RGB, offset: number): void {
	if (oneLine(text)) drawTextCentered(c, text, y, 2, color, P.black, FONT_3X5);
	else drawTextScrolling(c, text, 7, y, LABEL_WIDTH, offset, MARQUEE_GAP, 2, color, P.black, FONT_3X5);
}

/**
 * Workspace name in the bottom band of a key (wrapped to two lines), or the workspace plus a dimmer subtitle line
 * when the workspace has several agents. Lines too long for the key are never cut: they scroll like a marquee.
 */
export function label(c: Canvas, text: string, color: RGB, subtitle?: string, frame = 0): void {
	const [titleOffset, subtitleOffset] = labelOffsets(text, subtitle, frame);
	if (subtitle) {
		line(c, text, 80, color, titleOffset);
		line(c, subtitle, 94, shade(color, 0.7), subtitleOffset);
		return;
	}
	if (titleScrolls(text)) {
		line(c, text, 86, color, titleOffset);
		return;
	}
	const lines = wrapPixels(text, LABEL_WIDTH, 2, 2, FONT_3X5);
	const top = lines.length === 1 ? 86 : 80;
	lines.forEach((l, i) => drawTextCentered(c, l, top + i * 14, 2, color, P.black, FONT_3X5));
}

export function frameBorder(c: Canvas, color: RGB, width: number): void {
	c.rect(0, 0, SIZE, width, color);
	c.rect(0, SIZE - width, SIZE, width, color);
	c.rect(0, 0, width, SIZE, color);
	c.rect(SIZE - width, 0, width, SIZE, color);
}
