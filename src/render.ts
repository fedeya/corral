import type { AgentStatus } from "./herdr";
import { type Canvas, drawTextCentered, FONT_3X5, hex, type RGB, wrapPixels } from "./pixel";

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

/** Workspace name in the bottom band of a key (one or two lines). */
export function label(c: Canvas, text: string, color: RGB): void {
	const lines = wrapPixels(text, SIZE - 14, 2, 2, FONT_3X5);
	const top = lines.length === 1 ? 86 : 80;
	lines.forEach((line, i) => drawTextCentered(c, line, top + i * 14, 2, color, P.black, FONT_3X5));
}

export function frameBorder(c: Canvas, color: RGB, width: number): void {
	c.rect(0, 0, SIZE, width, color);
	c.rect(0, SIZE - width, SIZE, width, color);
	c.rect(0, 0, width, SIZE, color);
	c.rect(SIZE - width, 0, width, SIZE, color);
}
