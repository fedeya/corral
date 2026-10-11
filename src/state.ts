import streamDeck from "@elgato/streamdeck";
import { type Agent, listAgents } from "./herdr";
import { AgentLayout, type LayoutSlot } from "./layout";
import { prepareThemes, THEMES, type Theme } from "./themes";

const POLL_MS = 1000;
const BANNER_MS = 1500;
const FRAME_MS = 125;

let agents: Agent[] = [];
let error: string | null = null;
const layout = new AgentLayout();
let slots: LayoutSlot[] = [];
let layoutVersion = 0;
let frame = 0;
let pollTimer: NodeJS.Timeout | null = null;
let frameTimer: NodeJS.Timeout | null = null;
let polling: Promise<void> | null = null;
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
		return layout.page;
	},
	get pageCount() {
		return layout.pageCount;
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
	get layoutVersion() {
		return layoutVersion;
	},
	setSlots(next: LayoutSlot[]) {
		if (JSON.stringify(slots) === JSON.stringify(next)) return;
		slots = next;
		layout.setSlots(next);
		layoutVersion++;
		notify();
	},
	resolved() {
		return layout.resolve();
	},
	togglePin(id: string, paneId?: string): boolean {
		const before = layout.resolve().find((s) => s.id === id)?.pinned;
		layout.togglePin(id, paneId);
		const after = layout.resolve().find((s) => s.id === id)?.pinned;
		if (before === after) return false;
		layoutVersion++;
		notify();
		return true;
	},
	agentAt(slot: number): Agent | undefined {
		return layout.resolve()[slot]?.agent;
	},
	/** Agents on the current key page with their key position; falls back to 8 agents across 4 columns. */
	visible(deviceId?: string): Visible[] {
		return layout.visible(deviceId);
	},
	turnPage(delta: number) {
		layout.turnPage(delta);
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

function refresh(): Promise<void> {
	return (polling ??= poll().finally(() => {
		polling = null;
	}));
}

async function poll() {
	try {
		agents = await listAgents();
		layout.setAgents(agents);
		prepareThemes(agents);
		error = null;
	} catch (err) {
		error = "herdr off";
		streamDeck.logger.warn(`herdr agent list failed: ${err}`);
	}
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
		const { theme } = await streamDeck.settings.getGlobalSettings<{
			theme?: string;
		}>();
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
