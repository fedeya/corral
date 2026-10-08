// A pretend coding agent for demo videos. Runs inside a herdr pane, looks like an agent CLI at work (OpenCode or
// Claude Code style), and reports its state to herdr so Corral (and herdr) treat it like a real agent.
// Started by `bun run demo on`. Usage: bun scripts/fake-agent.ts <task> <story-start-ms>
import { execFile } from "node:child_process";
import { type Step, type Task, TASKS } from "./demo-story";

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
	const args = ["pane", "report-agent", "--source", "corral-demo", "--agent", task!.agent, "--state", state, "--seq", String(++seq)];
	if (message) args.push("--message", message);
	execFile(process.env.HERDR_BIN_PATH ?? "herdr", [...args, pane], () => {});
}

// --- terminal helpers ----------------------------------------------------------------------------------------

const ESC = "\x1b[";
const fg = (n: number) => (s: string) => `${ESC}38;5;${n}m${s}${ESC}39m`;
const bg = (n: number) => (s: string) => `${ESC}48;5;${n}m${s}${ESC}49m`;
const dim = (s: string) => `${ESC}2m${s}${ESC}22m`;
const bold = (s: string) => `${ESC}1m${s}${ESC}22m`;
// biome-ignore lint/suspicious/noControlCharactersInRegex: strip ANSI to measure
const visibleLength = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "").length;
const width = () => Math.min(process.stdout.columns || 100, 120);
const fill = (s: string, w = width()) => s + " ".repeat(Math.max(0, w - visibleLength(s)));

// --- looks ---------------------------------------------------------------------------------------------------

type Look = {
	/** Shown before the task starts. */
	welcome(): string[];
	/** Whether starting the task clears the welcome screen. */
	clearsWelcome: boolean;
	user(text: string): string[];
	step(step: Step): string[];
	approved(): string[];
	done(summary: string, seconds: number): string[];
	/** Bottom of the screen; `frame` animates, `busy` is the elapsed seconds while working. */
	footer(frame: number, busy: { seconds: number; tokens: number } | null): string[];
	question(task: Task): string[];
};

function diff(at: number, removed: string[], added: string[], indent: string, numbers: (s: string) => string): string[] {
	return [
		...removed.map((l, i) => `${indent}${numbers(String(at + i).padStart(3))} ${bg(52)(fill(`- ${l}`, width() - indent.length - 5))}`),
		...added.map((l, i) => `${indent}${numbers(String(at + i).padStart(3))} ${bg(22)(fill(`+ ${l}`, width() - indent.length - 5))}`),
	];
}

const OC = {
	accent: fg(216), // peach
	build: fg(75), // blue
	muted: fg(244),
	panel: bg(235),
};

const LOGO = [
	["█▀▀█ █▀▀█ █▀▀ █▀▀▄ ", "█▀▀ █▀▀█ █▀▀▄ █▀▀"],
	["█░░█ █░░█ █▀▀ █░░█ ", "█░░ █░░█ █░░█ █▀▀"],
	["▀▀▀▀ █▀▀▀ ▀▀▀ ▀  ▀ ", "▀▀▀ ▀▀▀▀ ▀▀▀  ▀▀▀"],
];

const opencode: Look = {
	welcome() {
		const pad = " ".repeat(Math.max(0, Math.floor((width() - 36) / 2)));
		return [
			"",
			"",
			"",
			...LOGO.map(([a, b]) => `${pad}${OC.muted(a!)}${bold(b!)}`),
			"",
			`${pad}${OC.muted("/new")}       new session`,
			`${pad}${OC.muted("/sessions")}  list sessions`,
			`${pad}${OC.muted("/models")}    switch model`,
			"",
		];
	},
	clearsWelcome: true,
	user(text) {
		const bar = OC.accent("┃");
		return ["", `${bar}`, `${bar}  ${text}`, `${bar}`, ""];
	},
	step(s) {
		const i = "   ";
		switch (s.kind) {
			case "say":
				return [`${i}${s.text}`, ""];
			case "read":
				return [`${i}${OC.muted("→")} Read ${s.path}`, ""];
			case "search":
				return [`${i}${OC.muted("✱")} Grep "${s.pattern}" ${OC.muted(`(${s.files} matches)`)}`, ""];
			case "bash":
				return [`${i}${OC.muted("$")} ${s.cmd}`, ...(s.out ? [`${i}  ${OC.muted(s.out)}`] : []), ""];
			case "edit":
				return [`${i}${OC.muted("←")} Edit ${s.path}`, ...diff(s.at, s.removed, s.added, `${i}  `, OC.muted), ""];
		}
	},
	approved() {
		return [`   ${OC.muted("Permission granted: allow once")}`, ""];
	},
	done(summary, seconds) {
		return [`   ${summary}`, "", `   ${OC.build("▣")} ${OC.muted(`Build · claude-sonnet-4-5 · ${seconds.toFixed(1)}s`)}`, ""];
	},
	footer(frame, busy) {
		const box = (s: string) => `${OC.build("┃")}${OC.panel(fill(s, width() - 1))}`;
		const hints = OC.muted("tab agents  ctrl+p commands");
		let status = "";
		if (busy) {
			// A block that sweeps back and forth.
			const n = 8;
			const step = frame % (2 * n - 2);
			const pos = step < n ? step : 2 * n - 2 - step;
			const bar = Array.from({ length: n }, (_, k) => (Math.abs(k - pos) <= 1 ? OC.accent("■") : OC.muted("⬝"))).join("");
			status = `${bar}  ${OC.muted("esc")} interrupt`;
		}
		return [
			"",
			box(""),
			box(`  ${OC.muted("Ask anything... \"Fix a TODO in the codebase\"")}`),
			box(""),
			box(`  ${OC.build("Build")}  Claude Sonnet 4.5 ${OC.muted("Anthropic")}`),
			OC.build("╹") + fg(235)("▀".repeat(width() - 1)),
			` ${fill(status, width() - visibleLength(hints) - 2)}${hints}`,
		];
	},
	question(t) {
		const box = (s: string) => `${OC.accent("┃")}${OC.panel(fill(s, width() - 1))}`;
		const what = t.asks ? opencode.step(t.asks).filter((l) => l !== "") : [];
		const selected = bg(216)(fg(235)(" Allow once "));
		return [
			"",
			box(""),
			box(`  ${OC.accent("△")} ${bold("Permission required")}`),
			box(`  ${t.question ?? ""}`),
			box(""),
			...what.map((l) => box(l.replace(/^ {3}/, "  "))),
			box(""),
			box(`  ${selected}  ${OC.muted(" Allow always ")}  ${OC.muted(" Reject ")}`),
			box(""),
			` ${fill("", width() - 30)}${OC.muted("⇆ select  enter confirm")}`,
		];
	},
};

const CC = { orange: fg(209), green: fg(114), blue: fg(111), dim };

function ccBox(lines: string[], colour: (s: string) => string = dim): string[] {
	const w = width() - 2;
	return [colour(`╭${"─".repeat(w)}╮`), ...lines.map((l) => `${colour("│")} ${fill(l, w - 2)} ${colour("│")}`), colour(`╰${"─".repeat(w)}╯`)];
}

const SPIN = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];

const claude: Look = {
	welcome() {
		return [...ccBox([`${CC.orange("✻")} ${bold("Welcome to Claude Code!")}`, "", dim(`  cwd: ~/code/${name}`)]), ""];
	},
	clearsWelcome: false,
	user(text) {
		return [...ccBox([`${dim(">")} ${text}`]), ""];
	},
	step(s) {
		const dot = CC.green("⏺");
		switch (s.kind) {
			case "say":
				return [`${dot} ${s.text}`, ""];
			case "read":
				return [`${dot} ${bold("Read")}(${s.path})`, dim(`  ⎿  Read ${s.lines} lines`), ""];
			case "search":
				return [`${dot} ${bold("Search")}(pattern: "${s.pattern}")`, dim(`  ⎿  Found ${s.files} files`), ""];
			case "bash":
				return [`${dot} ${bold("Bash")}(${s.cmd})`, ...(s.out ? [dim(`  ⎿  ${s.out}`)] : []), ""];
			case "edit":
				return [
					`${dot} ${bold("Update")}(${s.path})`,
					dim(`  ⎿  Updated ${s.path} with ${s.added.length} additions and ${s.removed.length} removals`),
					...diff(s.at, s.removed, s.added, "     ", dim),
					"",
				];
		}
	},
	approved() {
		return [dim("  ⎿  Approved"), ""];
	},
	done(summary) {
		return [`${CC.green("⏺")} ${summary}`, ""];
	},
	footer(frame, busy) {
		const input = ccBox([`${dim(">")} ${dim('Try "fix the failing tests"')}`]);
		if (!busy) return ["", ...input, dim("  ? for shortcuts")];
		const verb = ["Thinking", "Pondering", "Noodling", "Herding", "Cooking"][name.length % 5]!;
		return [
			"",
			`${CC.orange(SPIN[frame % SPIN.length]!)} ${CC.orange(`${verb}…`)} ${dim(`(${busy.seconds}s · ↑ ${(busy.tokens / 1000).toFixed(1)}k tokens · esc to interrupt)`)}`,
			"",
			...input,
			dim("  ? for shortcuts"),
		];
	},
	question(t) {
		const what = t.asks ? claude.step(t.asks).filter((l) => l !== "") : [];
		return [
			"",
			...ccBox(
				[
					bold(t.question ?? "Do you want to proceed?"),
					"",
					...what,
					"",
					`${CC.blue("❯")} ${CC.blue("1. Yes")}`,
					"  2. Yes, and don't ask again this session",
					"  3. No, and tell me what to do differently",
				],
				CC.blue,
			),
		];
	},
};

const look = task.agent === "opencode" ? opencode : claude;

// --- screen --------------------------------------------------------------------------------------------------

let log: string[] = [];
let footer: () => string[] = () => look.footer(0, null);

function draw(): void {
	const rows = process.stdout.rows || 40;
	const bottom = footer();
	const room = Math.max(0, rows - bottom.length);
	const visible = log.slice(Math.max(0, log.length - room));
	const gap = Math.max(0, room - visible.length);
	// Pin the footer to the bottom, like a full-screen TUI.
	const lines = [...visible, ...(look.clearsWelcome ? Array(gap).fill("") : []), ...bottom];
	process.stdout.write(`${ESC}H${ESC}2J${lines.join("\n")}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let ticking: ReturnType<typeof setInterval> | null = null;
let workStart = 0;
let tokens = 0;

function working(on: boolean): void {
	if (ticking) clearInterval(ticking);
	ticking = null;
	if (!on) {
		footer = () => look.footer(0, null);
		return draw();
	}
	let frame = 0;
	footer = () => look.footer(frame, { seconds: Math.floor((Date.now() - workStart) / 1000), tokens });
	ticking = setInterval(() => {
		frame++;
		tokens += 37;
		draw();
	}, 110);
}

async function play(steps: Step[]): Promise<void> {
	for (const step of steps) {
		await sleep(1800 + Math.random() * 1400);
		log.push(...look.step(step));
		draw();
	}
}

function waitForKey(): Promise<void> {
	return new Promise((resolve) => {
		const onKey = (buf: Buffer) => {
			const key = buf.toString();
			if (key === "\u0003") process.exit(0);
			if (key === "1" || key === "y" || key === "a" || key === "\r") {
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

log = look.welcome();
draw();
report("idle");

await until(task.start);
if (look.clearsWelcome) log = [];
log.push(...look.user(task.prompt));
workStart = Date.now();
report("working");
working(true);

const [before, after] =
	task.blockedAt === undefined ? [task.steps, []] : [task.steps.slice(0, task.blockedAt), task.steps.slice(task.blockedAt)];
await play(before);
if (task.blockedAt !== undefined) {
	await until(task.end);
	working(false);
	footer = () => look.question(task);
	draw();
	report("blocked", task.question);
	await waitForKey();
	log.push(...look.approved());
	report("working");
	working(true);
	await play(after);
} else {
	await until(task.end);
}
working(false);
log.push(...look.done(task.summary, (Date.now() - workStart) / 1000));
draw();
report("idle");
// Stay alive so the pane keeps its output; Ctrl-C quits.
setInterval(() => {}, 1 << 30);
