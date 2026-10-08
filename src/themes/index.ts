import type { Agent } from "../herdr";
import { Canvas, drawTextCentered, hasImage } from "../pixel";
import { P, SIZE, shade } from "../render";
import { farm } from "./farm";
import { KINGDOM_PROBE, kingdom } from "./kingdom";
import type { Theme } from "./types";

export type { Theme } from "./types";

/** Themes whose art is present; kingdom sprites are local-only (see themes/kingdom.ts). */
export const THEMES: Theme[] = [farm, ...(hasImage(KINGDOM_PROBE) ? [kingdom] : [])];

const cache = new Map<string, string>();

export function prepareThemes(agents: Agent[]): void {
	let stale = false;
	for (const theme of THEMES) stale = (theme.prepare?.(agents) ?? false) || stale;
	if (stale) cache.clear();
}

export function renderKey(theme: Theme, agent: Agent | undefined, frame: number, error: string | null): string {
	const id = error
		? `error:${error}`
		: agent
			? `${theme.id}:${agent.status}:${agent.workspace}:${agent.focused}:${theme.keyFrame(agent, frame)}`
			: "empty";
	const hit = cache.get(id);
	if (hit) return hit;

	let url: string;
	if (error || !agent) {
		const c = new Canvas(SIZE, SIZE);
		c.rect(0, 0, SIZE, SIZE, error ? P.navy : P.black);
		if (error) {
			c.rect(4, 64, SIZE - 8, 3, shade(P.navy, 0.6));
			drawTextCentered(c, error, 84, 2, P.silver, P.black);
		} else {
			c.rect(58, 58, 4, 4, shade(P.navy, 0.8));
		}
		url = c.toDataUrl();
	} else {
		url = theme.drawKey(agent, frame).toDataUrl();
	}

	if (cache.size > 600) cache.clear();
	cache.set(id, url);
	return url;
}
