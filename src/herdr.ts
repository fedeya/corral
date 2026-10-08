import { execFile } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const HERDR = process.env.HERDR_BIN_PATH ?? "/opt/homebrew/bin/herdr";
const TERMINAL_APP = process.env.HERDR_TERMINAL_APP ?? "Ghostty";

export type AgentStatus = "blocked" | "done" | "working" | "idle" | "unknown";

export type Agent = {
	paneId: string;
	status: AgentStatus;
	workspace: string;
	title: string;
	focused: boolean;
	seq: number;
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
	return title === "OpenCode" ? "" : title;
}

async function herdrJson<T>(...args: string[]): Promise<T> {
	const { stdout } = await run(HERDR, args, { timeout: 5000 });
	return JSON.parse(stdout).result as T;
}

export async function listAgents(): Promise<Agent[]> {
	const [agentResult, workspaceResult] = await Promise.all([
		herdrJson<{ agents?: RawAgent[] }>("agent", "list"),
		herdrJson<{ workspaces?: { workspace_id: string; label?: string }[] }>("workspace", "list"),
	]);
	const workspaceLabels = new Map((workspaceResult.workspaces ?? []).map((w) => [w.workspace_id, w.label ?? ""]));
	return (agentResult.agents ?? [])
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
		})
		.sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status] || b.seq - a.seq);
}

export async function focusAgent(paneId: string): Promise<void> {
	await run(HERDR, ["agent", "focus", paneId], { timeout: 5000 });
	await run("/usr/bin/open", ["-a", TERMINAL_APP]);
}
