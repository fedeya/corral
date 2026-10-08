// Demo mode: scripted fake agents, for filming and screenshots. Enabled while a `demo` file exists in the plugin
// folder (see `bun run demo on|off`); the story restarts whenever that file is touched.
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Agent, AgentStatus } from "./herdr";

const FLAG = join(dirname(process.argv[1] ?? "."), "../demo");
const LOOP_S = 90;

type Beat = [seconds: number, status: AgentStatus];

// A ~1.5 minute story: everyone gets to work, then agents start finishing and asking for you.
const SCRIPT: { workspace: string; beats: Beat[] }[] = [
	{ workspace: "auth-refactor", beats: [[0, "idle"], [1, "working"], [26, "done"]] },
	{ workspace: "landing-page", beats: [[0, "idle"], [2, "working"], [12, "blocked"]] },
	{ workspace: "stripe-webhooks", beats: [[0, "idle"], [3, "working"], [38, "blocked"]] },
	{ workspace: "flaky-tests", beats: [[0, "idle"], [4, "working"], [18, "done"]] },
	{ workspace: "dark-mode", beats: [[0, "idle"], [5, "working"], [55, "done"]] },
	{ workspace: "search-index", beats: [[0, "idle"], [6, "working"], [46, "blocked"]] },
	{ workspace: "docs", beats: [[0, "idle"], [30, "working"], [70, "done"]] },
	{ workspace: "onboarding", beats: [[0, "idle"]] },
	{ workspace: "analytics", beats: [[0, "idle"]] },
];

const PRIORITY: Record<AgentStatus, number> = { blocked: 0, done: 1, working: 2, idle: 3, unknown: 4 };

let story = 0;
let focused: string | null = null;
/** Status changes caused by pressing keys, as extra beats (seconds into the story). */
let reactions = new Map<string, Beat[]>();

export function isDemo(): boolean {
	return existsSync(FLAG);
}

function elapsed(): number {
	const started = statSync(FLAG).mtimeMs;
	if (started !== story) {
		story = started;
		focused = null;
		reactions = new Map();
	}
	return ((Date.now() - started) / 1000) % LOOP_S;
}

export function demoAgents(): Agent[] {
	const t = elapsed();
	return SCRIPT.map(({ workspace, beats }) => {
		const all = [...beats, ...(reactions.get(workspace) ?? [])].filter(([at]) => at <= t).sort((a, b) => a[0] - b[0]);
		const [at, status] = all[all.length - 1] ?? [0, "idle"];
		return { paneId: workspace, workspace, title: workspace, status, focused: focused === workspace, seq: at };
	}).sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status] || b.seq - a.seq);
}

/** Focusing a blocked agent "answers" it (back to work); focusing a done one clears it. */
export function demoFocus(paneId: string): void {
	const t = elapsed();
	focused = paneId;
	const agent = demoAgents().find((a) => a.paneId === paneId);
	const next: AgentStatus | null = agent?.status === "blocked" ? "working" : agent?.status === "done" ? "idle" : null;
	if (next) reactions.set(paneId, [...(reactions.get(paneId) ?? []), [t + 1.5, next]]);
}
