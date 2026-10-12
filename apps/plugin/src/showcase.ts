import type { Agent } from "./herdr";

/** Session-local presentation boundary. Never change identity or canonical agents. */
export class Showcase {
	active = false;
	#aliases = new Map<string, string>();
	toggle(): void {
		this.active = !this.active;
	}
	project(agent: Agent | undefined): Agent | undefined {
		if (!agent || !this.active) return agent;
		let alias = this.#aliases.get(agent.paneId);
		if (!alias) {
			let n = this.#aliases.size + 1;
			let letters = "";
			while (n > 0) {
				n--;
				letters = String.fromCharCode(65 + (n % 26)) + letters;
				n = Math.floor(n / 26);
			}
			alias = `AGENT ${letters}`;
			this.#aliases.set(agent.paneId, alias);
		}
		return { ...agent, workspace: alias, title: alias, subtitle: alias, appearanceWorkspace: agent.workspace };
	}
}
