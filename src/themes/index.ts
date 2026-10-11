import type { Agent } from "../herdr";
import { Canvas, drawText, drawTextCentered, FONT_3X5, hasImage } from "../pixel";
import { P, SIZE, shade } from "../render";
import { farm } from "./farm";
import { KINGDOM_PROBE, kingdom } from "./kingdom";
import { raid } from "./raid";
import type { Theme } from "./types";

export type { Theme } from "./types";

/** Themes whose art is present; kingdom sprites are local-only (see themes/kingdom.ts). */
export const THEMES: Theme[] = [farm, ...(hasImage(KINGDOM_PROBE) ? [kingdom] : []), raid];

const cache = new Map<string, string>();

export function prepareThemes(agents: Agent[]): void {
	let stale = false;
	for (const theme of THEMES) stale = (theme.prepare?.(agents) ?? false) || stale;
	if (stale) cache.clear();
}

export function renderKey(
	theme: Theme,
	agent: Agent | undefined,
	frame: number,
	error: string | null,
	pinned = false,
): string {
	const id = error
		? `error:${error}`
		: agent
			? JSON.stringify([theme.id, agent.status, agent.identity, agent.subtitle, agent.focused, theme.keyFrame(agent, frame), theme.keyState?.(agent) ?? ""])
			: "empty";
	const cacheId = `${id}:pin=${pinned}`;
	const hit = cache.get(cacheId);
	if (hit) return hit;

	let c: Canvas;
	if (error || !agent) {
		c = new Canvas(SIZE, SIZE);
		c.rect(0, 0, SIZE, SIZE, error ? P.navy : P.black);
		if (error) {
			c.rect(4, 64, SIZE - 8, 3, shade(P.navy, 0.6));
			drawTextCentered(c, error, 84, 2, P.silver, P.black);
		} else {
			c.rect(58, 58, 4, 4, shade(P.navy, 0.8));
		}
	} else {
		c = theme.drawKey(agent, frame);
	}
	if (pinned) {
		c.rect(4, 4, 46, 20, P.black, 0.9);
		c.pattern([".####.", "..##..", "..##..", ".####.", "..##..", "..#...", "..#..."], 6, 6, 2, { "#": P.yellow });
		drawText(c, "PIN", 22, 9, 2, P.yellow, undefined, FONT_3X5);
		if (!agent && !error) drawTextCentered(c, "MISSING", 80, 2, P.silver, P.black, FONT_3X5);
	}
	const url = c.toDataUrl();

	if (cache.size > 600) cache.clear();
	cache.set(cacheId, url);
	return url;
}
