import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const HERDR = process.env.HERDR_BIN_PATH ?? "/opt/homebrew/bin/herdr";
const TERMINAL_APP = process.env.HERDR_TERMINAL_APP ?? "Ghostty";

// Demo mode (`bun run demo on`): this file holds the socket of the pretend-agents herdr session to talk to.
const DEMO_FLAG = join(dirname(process.argv[1] ?? "."), "../demo");

function herdrEnv(): NodeJS.ProcessEnv | undefined {
	if (!existsSync(DEMO_FLAG)) return undefined;
	return { ...process.env, HERDR_SOCKET_PATH: readFileSync(DEMO_FLAG, "utf8").trim() };
}

export type AgentStatus = "blocked" | "done" | "working" | "idle" | "unknown";

export type Agent = {
	paneId: string;
	status: AgentStatus;
	workspace: string;
	title: string;
	focused: boolean;
	seq: number;
	/** Set when the workspace has several agents: tells them apart (the agent's title, or "#2", "#3"...). */
	subtitle?: string;
	/** Stable key for per-agent looks: the workspace, or workspace + pane when it has several agents. */
	identity: string;
};

type RawAgent = {
	pane_id: string;
	workspace_id: string;
	agent_status?: string;
	name?: string;
	terminal_title_stripped?: string;
	cwd?: string;
	focused?: boolean;
	state_change_seq?: number;
};

const PRIORITY: Record<AgentStatus, number> = { blocked: 0, done: 1, working: 2, idle: 3, unknown: 4 };

function titleFor(raw: RawAgent): string {
	if (raw.name) return raw.name;
	const title = (raw.terminal_title_stripped ?? "").replace(/^OC \| /, "").trim();
	return (title === "OpenCode" ? "" : title).replace(/…/g, "..");
}

async function herdrJson<T>(...args: string[]): Promise<T> {
	const { stdout } = await run(HERDR, args, { timeout: 5000, env: herdrEnv() });
	return JSON.parse(stdout).result as T;
}

export async function listAgents(): Promise<Agent[]> {
	const [agentResult, workspaceResult] = await Promise.all([
		herdrJson<{ agents?: RawAgent[] }>("agent", "list"),
		herdrJson<{ workspaces?: { workspace_id: string; label?: string }[] }>("workspace", "list"),
	]);
	const workspaceLabels = new Map((workspaceResult.workspaces ?? []).map((w) => [w.workspace_id, w.label ?? ""]));
	const agents = (agentResult.agents ?? [])
		.map((raw) => {
			const folder = basename((raw.cwd ?? "").replace(/`$/, "")) || raw.pane_id;
			const label = workspaceLabels.get(raw.workspace_id) || folder;
			const status = (raw.agent_status ?? "unknown") as AgentStatus;
			return {
				paneId: raw.pane_id,
				status: status in PRIORITY ? status : "unknown",
				workspace: label.split("/").pop() || label,
				title: titleFor(raw),
				focused: raw.focused ?? false,
				seq: raw.state_change_seq ?? 0,
			};
		});
	return withIdentities(agents).sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status] || b.seq - a.seq);
}

export function withIdentities(agents: Omit<Agent, "identity" | "subtitle">[]): Agent[] {
	const counts = new Map<string, number>();
	for (const a of agents) counts.set(a.workspace, (counts.get(a.workspace) ?? 0) + 1);
	const seen = new Map<string, number>();
	return agents.map((a) => {
		if ((counts.get(a.workspace) ?? 0) < 2) return { ...a, identity: a.workspace };
		const n = (seen.get(a.workspace) ?? 0) + 1;
		seen.set(a.workspace, n);
		return { ...a, subtitle: a.title || `#${n}`, identity: `${a.workspace}#${a.paneId}` };
	});
}

export async function focusAgent(paneId: string): Promise<void> {
	await run(HERDR, ["agent", "focus", paneId], { timeout: 5000, env: herdrEnv() });
	await run("/usr/bin/open", ["-a", TERMINAL_APP]);
}
