// A pretend coding agent for demo videos. Runs inside a herdr pane, looks like an agent CLI at work, and reports
// its state to herdr so Corral (and herdr) treat it like a real agent. Started by `bun run demo on`.
// Usage: bun scripts/fake-agent.ts <task> <story-start-ms>
import { execFile } from "node:child_process";
import { TASKS } from "./demo-story";

const name = process.argv[2] ?? "";
const start = Number(process.argv[3] ?? Date.now());
const task = TASKS[name];
if (!task) throw new Error(`unknown demo task: ${name}`);

// --- herdr ---------------------------------------------------------------------------------------------------

type State = "idle" | "working" | "blocked";
let seq = 0;
function report(state: State, message?: string): void {
	const pane = process.env.HERDR_PANE_ID;
	if (!pane) return;
	const args = ["pane", "report-agent", "--source", "corral-demo", "--agent", "claude", "--state", state, "--seq", String(++seq)];
	if (message) args.push("--message", message);
	execFile(process.env.HERDR_BIN_PATH ?? "herdr", [...args, pane], () => {});
}

// --- screen --------------------------------------------------------------------------------------------------

const ESC = "\x1b[";
const c = {
	dim: (s: string) => `${ESC}2m${s}${ESC}0m`,
	bold: (s: string) => `${ESC}1m${s}${ESC}0m`,
	orange: (s: string) => `${ESC}38;5;209m${s}${ESC}0m`,
	green: (s: string) => `${ESC}38;5;114m${s}${ESC}0m`,
	red: (s: string) => `${ESC}38;5;174m${s}${ESC}0m`,
	blue: (s: string) => `${ESC}38;5;111m${s}${ESC}0m`,
	addBg: (s: string) => `${ESC}48;5;22m${s}${ESC}0m`,
	delBg: (s: string) => `${ESC}48;5;52m${s}${ESC}0m`,
};

const log: string[] = [];
let footer: string[] = [];

function width(): number {
	return Math.min(process.stdout.columns || 100, 110);
}

function box(lines: string[], colour = c.dim): string[] {
	const w = width() - 2;
	const pad = (s: string) => {
		// biome-ignore lint/suspicious/noControlCharactersInRegex: strip ANSI to measure
		const visible = s.replace(/\x1b\[[0-9;]*m/g, "").length;
		return s + " ".repeat(Math.max(0, w - 2 - visible));
	};
	return [colour(`╭${"─".repeat(w)}╮`), ...lines.map((l) => `${colour("│")} ${pad(l)}${colour("│")}`), colour(`╰${"─".repeat(w)}╯`)];
}

function draw(): void {
	const rows = process.stdout.rows || 40;
	const body = [...log];
	const room = rows - footer.length - 1;
	const visible = body.slice(Math.max(0, body.length - room));
	process.stdout.write(`${ESC}H${ESC}2J${visible.join("\n")}\n${footer.join("\n")}`);
}

function header(): void {
	log.push(...box([`${c.orange("✻")} ${c.bold("Welcome to your agent")}`, "", c.dim(`  cwd: ~/code/${name}`)]), "");
}

function prompt(text = ""): string[] {
	return box([`${c.dim(">")} ${text}${text ? "" : c.dim("Try \"fix the failing tests\"")}`]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- story ---------------------------------------------------------------------------------------------------

const SPIN = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];
const VERBS = ["Thinking", "Pondering", "Reticulating", "Noodling", "Herding", "Cooking"];
let spinning: ReturnType<typeof setInterval> | null = null;
let workStart = 0;
let tokens = 0;

function spin(on: boolean): void {
	if (spinning) clearInterval(spinning);
	spinning = null;
	footer = [];
	if (!on) return draw();
	let i = 0;
	const verb = VERBS[name.length % VERBS.length]!;
	spinning = setInterval(() => {
		const secs = Math.floor((Date.now() - workStart) / 1000);
		tokens += 37;
		footer = [
			"",
			`${c.orange(SPIN[i++ % SPIN.length]!)} ${c.orange(`${verb}…`)} ${c.dim(`(${secs}s · ↑ ${(tokens / 1000).toFixed(1)}k tokens · esc to interrupt)`)}`,
			"",
			...prompt(),
		];
		draw();
	}, 120);
}

async function play(steps: string[][]): Promise<void> {
	for (const step of steps) {
		await sleep(1800 + Math.random() * 1400);
		log.push(...step, "");
		draw();
	}
}

function waitForKey(): Promise<void> {
	return new Promise((resolve) => {
		const onKey = (buf: Buffer) => {
			const key = buf.toString();
			if (key === "\u0003") process.exit(0);
			if (key === "1" || key === "y" || key === "\r") {
				process.stdin.off("data", onKey);
				resolve();
			}
		};
		process.stdin.on("data", onKey);
	});
}

async function until(seconds: number): Promise<void> {
	const wait = start + seconds * 1000 - Date.now();
	if (wait > 0) await sleep(wait);
}

process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdout.write(`${ESC}?25l`);
process.on("exit", () => process.stdout.write(`${ESC}?25h`));
process.stdout.on("resize", draw);

header();
footer = prompt();
draw();
report("idle");

await until(task.start);
log.push(...prompt(task.prompt), "");
workStart = Date.now();
report("working");
spin(true);

const [before, after] = task.blockedAt === undefined ? [task.steps, []] : [task.steps.slice(0, task.blockedAt), task.steps.slice(task.blockedAt)];
await play(before);
if (task.blockedAt !== undefined) {
	await until(task.end);
	spin(false);
	footer = [
		"",
		...box(
			[c.bold(task.question ?? "Do you want to proceed?"), "", `${c.blue("❯")} ${c.blue("1. Yes")}`, "  2. Yes, and don't ask again this session", "  3. No, and tell me what to do differently"],
			c.blue,
		),
	];
	draw();
	report("blocked", task.question);
	await waitForKey();
	footer = [];
	log.push(c.dim("  ⎿  Approved"), "");
	report("working");
	spin(true);
	await play(after);
} else {
	await until(task.end);
}
spin(false);
log.push(`${c.green("⏺")} ${task.summary}`, "");
footer = prompt();
draw();
report("idle");
// Stay alive so the pane keeps its output; Ctrl-C quits.
setInterval(() => {}, 1 << 30);
