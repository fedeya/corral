import streamDeck from "@elgato/streamdeck";
import { type Agent, listAgents } from "./herdr";
import { prepareThemes, THEMES, type Theme } from "./themes";

const POLL_MS = 1000;
const BANNER_MS = 1500;
const FRAME_MS = 125;

let agents: Agent[] = [];
let error: string | null = null;
let page = 0;
let slots: Slot[] = [];
let frame = 0;
let pollTimer: NodeJS.Timeout | null = null;
let frameTimer: NodeJS.Timeout | null = null;
let polling = false;
let themeIndex = 0;
let themeChangedAt = 0;
let themeLoaded = false;
const listeners = new Set<() => void>();

export type Slot = { column: number; row: number };
export type Visible = Slot & { agent: Agent };

export const state = {
	get agents() {
		return agents;
	},
	get error() {
		return error;
	},
	get page() {
		return page;
	},
	get pageCount() {
		return Math.max(1, Math.ceil(agents.length / Math.max(1, slots.length)));
	},
	get frame() {
		return frame;
	},
	get theme(): Theme {
		return THEMES[themeIndex] ?? THEMES[0]!;
	},
	/** Theme name to flash on the touch strip right after switching, or null. */
	get themeBanner(): string | null {
		return Date.now() - themeChangedAt < BANNER_MS ? this.theme.name : null;
	},
	cycleTheme(delta: number) {
		const count = THEMES.length;
		themeIndex = (((themeIndex + delta) % count) + count) % count;
		themeChangedAt = Date.now();
		void streamDeck.settings.setGlobalSettings({ theme: this.theme.id });
		notify();
	},
	setSlots(layout: Slot[]) {
		slots = layout;
		page = Math.min(page, this.pageCount - 1);
	},
	agentAt(slot: number): Agent | undefined {
		return agents[page * Math.max(1, slots.length) + slot];
	},
	/** Agents on the current key page with their key position; falls back to 8 agents across 4 columns. */
	visible(): Visible[] {
		const layout = slots.length > 0 ? slots : Array.from({ length: 8 }, (_, i) => ({ column: i % 4, row: Math.floor(i / 4) }));
		return layout.flatMap((slot, i) => {
			const agent = slots.length > 0 ? this.agentAt(i) : agents[i];
			return agent ? [{ ...slot, agent }] : [];
		});
	},
	turnPage(delta: number) {
		const count = this.pageCount;
		page = (((page + delta) % count) + count) % count;
		notify();
	},
	mostUrgent(): Agent | undefined {
		return agents.find((a) => !a.focused && (a.status === "blocked" || a.status === "done"));
	},
	subscribe(listener: () => void): () => void {
		listeners.add(listener);
		start();
		return () => {
			listeners.delete(listener);
			if (listeners.size === 0) stop();
		};
	},
	refresh,
};

function notify() {
	for (const listener of listeners) listener();
}

async function refresh() {
	if (polling) return;
	polling = true;
	try {
		agents = await listAgents();
		prepareThemes(agents);
		error = null;
	} catch (err) {
		error = "herdr off";
		streamDeck.logger.warn(`herdr agent list failed: ${err}`);
	} finally {
		polling = false;
	}
	page = Math.min(page, state.pageCount - 1);
	notify();
}

function animate() {
	frame++;
	if (agents.length > 0) notify();
}

async function loadTheme() {
	if (themeLoaded) return;
	themeLoaded = true;
	try {
		const { theme } = await streamDeck.settings.getGlobalSettings<{ theme?: string }>();
		const index = THEMES.findIndex((t) => t.id === theme);
		if (index >= 0) themeIndex = index;
		notify();
	} catch (err) {
		streamDeck.logger.warn(`could not load theme: ${err}`);
	}
}

function start() {
	if (pollTimer) return;
	void loadTheme();
	void refresh();
	pollTimer = setInterval(refresh, POLL_MS);
	frameTimer = setInterval(animate, FRAME_MS);
}

function stop() {
	if (pollTimer) clearInterval(pollTimer);
	if (frameTimer) clearInterval(frameTimer);
	pollTimer = null;
	frameTimer = null;
}
