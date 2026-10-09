// Renders the animated GIFs used in the README (docs/media/<theme>.gif) with sample agents, using ffmpeg.
// Usage: bun run media
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { type Agent, type AgentStatus, withIdentities } from "../src/herdr";
import { Canvas, hex, type RGB } from "../src/pixel";
import { prepareThemes, renderKey, THEMES } from "../src/themes";

const FRAMES = 48; // 6 s at 8 fps; the strip animates every other frame, like on the device
const PAD = 24;
const SEG = 200;
const KEY = 120;
const ROW_GAP = 16;
const STRIP_GAP = 24;
const W = PAD * 2 + 4 * SEG;
const H = PAD * 2 + 2 * KEY + ROW_GAP + STRIP_GAP + 100;
const BODY = hex("#17171b");
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../docs/media");

const sample: [string, AgentStatus][] = [
	["api", "working"],
	["web-app", "blocked"],
	["docs", "done"],
	["billing", "idle"],
	["search", "working"],
	["infra", "working"],
	["mobile", "idle"],
];
const agents: Agent[] = withIdentities(sample.map(([workspace, status], i) => ({
	paneId: `p${i}`,
	title: workspace,
	workspace,
	status,
	focused: false,
	seq: i,
})));
// Stream Deck + with the top-left key used as "back", as in a folder.
const slots = [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]] as const;
const visible = agents.map((agent, i) => ({ agent, column: slots[i]![0], row: slots[i]![1] }));

function paste(dst: Canvas, src: { width: number; height: number; data: Buffer }, ox: number, oy: number, radius: number) {
	for (let y = 0; y < src.height; y++) {
		for (let x = 0; x < src.width; x++) {
			// Rounded corners, like the physical keys and LCD.
			const cx = x < radius ? radius - x : x >= src.width - radius ? x - (src.width - radius - 1) : 0;
			const cy = y < radius ? radius - y : y >= src.height - radius ? y - (src.height - radius - 1) : 0;
			if (cx * cx + cy * cy > radius * radius) continue;
			const i = (y * src.width + x) * 4;
			dst.set(ox + x, oy + y, [src.data[i]!, src.data[i + 1]!, src.data[i + 2]!]);
		}
	}
}

function backKey(): Canvas {
	const c = new Canvas(KEY, KEY);
	c.rect(0, 0, KEY, KEY, hex("#000000"));
	const arrow: RGB = hex("#5f574f");
	c.pattern(["...#", "..#.", ".#..", "#...", ".#..", "..#.", "...#"], 52, 46, 4, { "#": arrow });
	return c;
}

const decode = (url: string) => PNG.sync.read(Buffer.from(url.split(",")[1]!, "base64"));

mkdirSync(OUT, { recursive: true });
prepareThemes(agents);

for (const theme of THEMES) {
	const dir = mkdtempSync(join(tmpdir(), `corral-${theme.id}-`));
	// Let everyone walk in and settle before recording.
	for (let s = 0; s < 40; s++) theme.scene.render(visible, s, 14);
	for (let f = 0; f < FRAMES; f++) {
		const c = new Canvas(W, H);
		c.rect(0, 0, W, H, BODY);
		paste(c, backKey(), PAD + (SEG - KEY) / 2, PAD, 10);
		for (const v of visible) {
			const key = decode(renderKey(theme, v.agent, f, null));
			paste(c, key, PAD + v.column * SEG + (SEG - KEY) / 2, PAD + v.row * (KEY + ROW_GAP), 10);
		}
		paste(c, theme.scene.render(visible, 40 + Math.floor(f / 2), 14), PAD, PAD + 2 * KEY + ROW_GAP + STRIP_GAP, 8);
		const png = new PNG({ width: W, height: H });
		c.data.copy(png.data);
		writeFileSync(join(dir, `f${String(f).padStart(3, "0")}.png`), PNG.sync.write(png));
	}
	const gif = join(OUT, `${theme.id}.gif`);
	execFileSync("ffmpeg", [
		"-y",
		"-loglevel",
		"error",
		"-framerate",
		"8",
		"-i",
		join(dir, "f%03d.png"),
		"-vf",
		"split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none",
		"-loop",
		"0",
		gif,
	]);
	rmSync(dir, { recursive: true });
	console.log(gif);
}
