import type { Agent } from "./herdr";
import { type Canvas, drawText, fitText, FONT_3X5 } from "./pixel";
import { P } from "./render";

/** Fixed scene-space contract, independent of animated actors and label lengths. */
export const BEACON_BOUNDS = { x: 600, y: 40, width: 200, height: 26 } as const;

export function beaconContains(x: number, y: number): boolean {
	return x >= 600 && x < 800 && y >= 40 && y < 66;
}

export function drawBlockedBeacon(canvas: Canvas, beacon: BlockedBeacon, frame: number): void {
	const { x, y, width, height } = BEACON_BOUNDS;
	canvas.rect(x, y, width, height, P.navy);
	canvas.rect(x, y, width, 1, P.yellow);
	canvas.rect(x, y + height - 1, width, 1, P.yellow);
	// Original pixel signal tower: bright lamp, outward rays, mast and foot.
	const lamp = frame % 4 < 2 ? P.red : P.yellow;
	canvas.rect(x + 9, y + 6, 10, 9, lamp);
	canvas.rect(x + 11, y + 4, 6, 2, lamp);
	canvas.rect(x + 13, y + 15, 2, 5, P.silver);
	canvas.rect(x + 8, y + 20, 12, 2, P.silver);
	canvas.rect(x + 3, y + 6, 3, 2, P.yellow);
	canvas.rect(x + 22, y + 6, 3, 2, P.yellow);
	canvas.rect(x + 13, y + 1, 2, 2, P.yellow);
	drawText(canvas, `${beacon.count} BLOCKED`, x + 29, y + 3, 2, P.yellow, undefined, FONT_3X5);
	const label = beacon.agent.subtitle ?? beacon.agent.workspace;
	drawText(canvas, fitText(label.toUpperCase(), width - 34, 2, FONT_3X5), x + 29, y + 14, 2, P.white, undefined, FONT_3X5);
}

export type BlockedBeacon = { count: number; agent: Agent };

/** Device-local selection: roster priority changes must not silently change its target. */
export class OffscreenBeacon {
	#selected = new Map<string, string>();

	select(deviceId: string, candidates: Agent[]): BlockedBeacon | undefined {
		const panes = new Map(candidates.map((agent) => [agent.paneId, agent]));
		const agent = panes.get(this.#selected.get(deviceId) ?? "") ?? panes.values().next().value;
		if (!agent) {
			this.#selected.delete(deviceId);
			return undefined;
		}
		this.#selected.set(deviceId, agent.paneId);
		return { count: panes.size, agent };
	}
}
