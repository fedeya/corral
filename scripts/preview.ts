// Renders a theme's keys and touch strip (day and night) to a PNG, without a Stream Deck.
// Usage: bun run preview [theme-id] [--open]   (theme-id may be an unregistered file in src/themes/)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { type Agent, type AgentStatus, listAgents } from "../src/herdr";
import type { Canvas } from "../src/pixel";
import { prepareThemes, renderKey, type Theme, THEMES } from "../src/themes";

const id = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? THEMES[0]!.id;

async function findTheme(): Promise<Theme> {
	const registered = THEMES.find((t) => t.id === id);
	if (registered) return registered;
	const name = id === "template" ? "_template" : id;
	const mod: Record<string, unknown> = await import(`../src/themes/${name}.ts`);
	const theme = Object.values(mod).find((v): v is Theme => typeof v === "object" && v !== null && "drawKey" in v);
	if (!theme) throw new Error(`no theme "${id}" (registered: ${THEMES.map((t) => t.id).join(", ")})`);
	return theme;
}

const SAMPLE = ["herdr", "api-refactor", "docs-site", "flaky-tests", "billing", "search-v2", "onboarding"];

async function agents(): Promise<Agent[]> {
	const live = await listAgents().catch((): Agent[] => []);
	const base: Agent[] =
		live.length >= 7
			? live
			: SAMPLE.map((workspace, i) => ({ paneId: `p${i}`, title: workspace, workspace, status: "idle", focused: false, seq: i }));
	prepareThemes(base);
	theme.prepare?.(base);
	const statuses: AgentStatus[] = ["working", "blocked", "done", "idle", "working", "idle", "working"];
	return base.slice(0, 7).map((a, i) => ({ ...a, status: statuses[i]!, focused: i === 2 }));
}

const theme = await findTheme();
const shown = await agents();
// Stream Deck + layout used by the Agents folder: top-left key is "back", so 7 agent keys.
const slots = [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]] as const;
const visible = shown.map((agent, i) => ({ agent, column: slots[i]![0], row: slots[i]![1] }));

const S = 2;
const GAP = 8;
const W = 800;
const H = 2 * (120 + GAP) + 2 * (100 + GAP);
const out = new PNG({ width: W * S, height: H * S });
out.data.fill(30);
const put = (img: { width: number; height: number; data: Buffer }, ox: number, oy: number) => {
	for (let y = 0; y < img.height * S; y++) {
		for (let x = 0; x < img.width * S; x++) {
			const si = (Math.floor(y / S) * img.width + Math.floor(x / S)) * 4;
			img.data.copy(out.data, ((oy * S + y) * W * S + ox * S + x) * 4, si, si + 4);
		}
	}
};
const decode = (url: string) => PNG.sync.read(Buffer.from(url.split(",")[1]!, "base64"));

const frame = 43;
for (const v of visible) put(decode(renderKey(theme, v.agent, frame, null)), v.column * 200 + 40, v.row * (120 + GAP));
let scene: Canvas | undefined;
for (let f = 0; f < 30; f++) scene = theme.scene.render(visible, f, 14);
put(scene!, 0, 2 * (120 + GAP));
for (let f = 30; f < 40; f++) scene = theme.scene.render(visible, f, 23);
put(scene!, 0, 2 * (120 + GAP) + 100 + GAP);

const file = join(tmpdir(), `herdr-sd-preview-${theme.id}.png`);
writeFileSync(file, PNG.sync.write(out));
console.log(file);
if (process.argv.includes("--open")) execFileSync("open", [file]);
