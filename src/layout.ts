import type { Agent } from "./herdr";

export type LayoutSlot = {
	id: string;
	column: number;
	row: number;
	deviceId?: string;
};
export type ResolvedSlot = LayoutSlot & { agent?: Agent; pinned: boolean };

/** Session-only, action-ID anchored layout shared by keys and strip. */
export class AgentLayout {
	#agents: Agent[] = [];
	#slots: LayoutSlot[] = [];
	#pins = new Map<string, string>();
	page = 0;
	setSlots(slots: LayoutSlot[]): void {
		const seen = new Set<string>();
		this.#slots = slots.filter((s) => {
			if (seen.has(s.id)) return false;
			seen.add(s.id);
			return true;
		});
		const active = new Set(slots.map((s) => s.id));
		for (const id of this.#pins.keys()) if (!active.has(id)) this.#pins.delete(id);
		this.#clamp();
	}
	setAgents(agents: Agent[]): void {
		const seen = new Set<string>();
		this.#agents = agents.filter((a) => {
			if (seen.has(a.paneId)) return false;
			seen.add(a.paneId);
			return true;
		});
		this.#clamp();
	}
	get pageCount(): number {
		const capacity = this.#slots.filter((s) => !this.#pins.has(s.id)).length;
		return capacity === 0 ? 1 : Math.max(1, Math.ceil(this.#free().length / capacity));
	}
	turnPage(delta: number): void {
		this.page = (((this.page + delta) % this.pageCount) + this.pageCount) % this.pageCount;
	}
	#clamp(): void {
		this.page = Math.min(this.page, this.pageCount - 1);
	}
	#free(): Agent[] {
		const pinned = new Set(this.#pins.values());
		return this.#agents.filter((a) => !pinned.has(a.paneId));
	}
	togglePin(id: string, paneId?: string): void {
		if (this.#pins.has(id)) this.#pins.delete(id);
		else if (paneId && this.#slots.some((s) => s.id === id) && ![...this.#pins.values()].includes(paneId))
			this.#pins.set(id, paneId);
		this.#clamp();
	}
	visible(deviceId?: string): (ResolvedSlot & { agent: Agent })[] {
		if (this.#slots.length === 0)
			return this.#agents.slice(0, 8).map((agent, i) => ({
				id: `fallback-${i}`,
				column: i % 4,
				row: Math.floor(i / 4),
				pinned: false,
				agent,
			}));
		return this.resolve().flatMap((s) =>
			s.agent && (deviceId === undefined || s.deviceId === deviceId) ? [{ ...s, agent: s.agent }] : [],
		);
	}
	resolve(): ResolvedSlot[] {
		const free = this.#free();
		let next = this.page * this.#slots.filter((s) => !this.#pins.has(s.id)).length;
		return this.#slots.map((slot) => {
			const paneId = this.#pins.get(slot.id);
			return {
				...slot,
				pinned: paneId !== undefined,
				agent: paneId !== undefined ? this.#agents.find((a) => a.paneId === paneId) : free[next++],
			};
		});
	}
}
