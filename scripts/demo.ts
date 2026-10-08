// Demo mode for recordings: a separate herdr session ("corral-demo") full of pretend agents that follow
// scripts/demo-story.ts, and the plugin pointed at it. Your real herdr session is left alone.
// Usage: bun run demo on    (re-run to restart the story)
//        bun run demo off
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TASKS } from "./demo-story";

const SESSION = "corral-demo";
const FLAG = join(import.meta.dirname, "../dev.fedeya.corral.sdPlugin/demo");
const AGENT = join(import.meta.dirname, "fake-agent.ts");
const HERDR = process.env.HERDR_BIN_PATH ?? "herdr";

function herdr<T = unknown>(...args: string[]): T {
	const out = execFileSync(HERDR, ["--session", SESSION, ...args], { encoding: "utf8" });
	return (out.trim() ? JSON.parse(out).result : {}) as T;
}

function socketPath(): string | undefined {
	const out = execFileSync(HERDR, ["session", "list"], { encoding: "utf8" });
	const line = out.split("\n").find((l) => l.startsWith(`${SESSION} `));
	if (!line?.includes("running")) return undefined;
	return line.trim().split(/\s+/).pop();
}

function restartPlugin(): void {
	execFileSync("streamdeck", ["restart", "dev.fedeya.corral"], { stdio: "ignore" });
}

async function on(): Promise<void> {
	if (!socketPath()) {
		spawn(HERDR, ["--session", SESSION, "server"], { detached: true, stdio: "ignore" }).unref();
		for (let i = 0; i < 50 && !socketPath(); i++) await new Promise((r) => setTimeout(r, 100));
	}
	const socket = socketPath();
	if (!socket) throw new Error(`could not start the ${SESSION} herdr session`);

	const { workspaces = [] } = herdr<{ workspaces?: { workspace_id: string }[] }>("workspace", "list");
	for (const w of workspaces) herdr("workspace", "close", w.workspace_id);

	// A plain shell first: it holds the focus, so agents finishing in the background show up as "done".
	const home = join(tmpdir(), "corral-demo");
	mkdirSync(home, { recursive: true });
	herdr("workspace", "create", "--label", "terminal", "--cwd", home, "--focus");

	const start = Date.now() + 2000;
	for (const name of Object.keys(TASKS)) {
		const cwd = join(tmpdir(), "corral-demo", name);
		mkdirSync(cwd, { recursive: true });
		const created = herdr<{ root_pane: { pane_id: string } }>("workspace", "create", "--label", name, "--cwd", cwd, "--no-focus");
		herdr("pane", "run", created.root_pane.pane_id, `clear; exec bun ${AGENT} ${name} ${start}`);
	}

	writeFileSync(FLAG, `${socket}\n`);
	restartPlugin();
	console.log(`Demo on: ${Object.keys(TASKS).length} pretend agents in the "${SESSION}" herdr session.`);
	console.log(`Open it in Ghostty with:  herdr --session ${SESSION}`);
	console.log("Run `bun run demo on` again to restart the story, `bun run demo off` to go back to your agents.");
}

function off(): void {
	rmSync(FLAG, { force: true });
	if (socketPath()) execFileSync(HERDR, ["session", "stop", SESSION], { stdio: "ignore" });
	restartPlugin();
	console.log("Demo off: the plugin shows your real agents again.");
}

const mode = process.argv[2];
if (mode === "on") await on();
else if (mode === "off") off();
else {
	console.error("usage: bun run demo on|off");
	process.exit(1);
}
