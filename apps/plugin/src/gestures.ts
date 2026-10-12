export const LONG_PRESS_MS = 500;
export type Gesture = { kind: "pin" | "focus"; paneId?: string };
/** A gesture captures the pane at keyDown; priority/page changes never retarget a tap. */
export class KeyGestures {
	#pending = new Map<string, { paneId?: string; at: number }>();
	cancel(id: string): void {
		this.#pending.delete(id);
	}
	down(id: string, paneId: string | undefined, at = performance.now()): void {
		if (!this.#pending.has(id)) this.#pending.set(id, { paneId, at });
	}
	up(id: string, at = performance.now()): Gesture | undefined {
		const press = this.#pending.get(id);
		this.#pending.delete(id);
		return press
			? {
					kind: at - press.at >= LONG_PRESS_MS ? "pin" : "focus",
					paneId: press.paneId,
				}
			: undefined;
	}
}
