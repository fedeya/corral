import type { JsonObject } from "@elgato/utils";
import streamDeck, {
	type DialAction,
	type DialDownEvent,
	type DialRotateEvent,
	SingletonAction,
	type TouchTapEvent,
} from "@elgato/streamdeck";
import { type Agent, focusAgent } from "../herdr";
import { drawText, drawTextCentered, FONT_3X5, FONT_5X7, textWidth } from "../pixel";
import { P } from "../render";
import { raidRound } from "../raid";
import { HEIGHT, SEGMENT, WIDTH, type Scene } from "../scene";
import { state } from "../state";

/** The rightmost dial switches themes; the others turn key pages. */
const THEME_DIAL_COLUMN = 3;

export class AgentsDial extends SingletonAction {
	override readonly manifestId = "dev.fedeya.corral.dial";

	#unsubscribe: (() => void) | null = null;
	#images = new Map<string, string>();
	#lastStep = -1;
	#lastAgents: unknown = null;
	#lastPage = -1;
	#lastLook = "";
	#scenes = new Map<string, { themeId: string; scene: Scene }>();

	override onWillAppear(): void {
		this.#lastStep = -1;
		this.#images.clear();
		this.#unsubscribe ??= state.subscribe(() => this.#render());
		this.#render();
	}

	override onWillDisappear(): void {
		queueMicrotask(() => {
			const devices = new Set(this.#dials().map((a) => a.device.id));
			for (const id of this.#scenes.keys()) if (!devices.has(id)) this.#scenes.delete(id);
			if (this.#dials().length === 0) {
				this.#unsubscribe?.();
				this.#unsubscribe = null;
				this.#images.clear();
			}
		});
	}

	override onDialRotate(ev: DialRotateEvent): void {
		const delta = Math.sign(ev.payload.ticks);
		if (ev.action.coordinates.column === THEME_DIAL_COLUMN) state.cycleTheme(delta);
		else state.turnPage(delta);
	}

	override async onDialDown(ev: DialDownEvent): Promise<void> {
		await this.#focus(ev.action, state.mostUrgent());
	}

	override async onTouchTap(ev: TouchTapEvent): Promise<void> {
		const column = ev.action.coordinates.column;
		const scene = this.#scene(ev.action.device.id);
		scene.render(state.error ? [] : state.visible(ev.action.device.id), Math.floor(state.frame / 2));
		await this.#focus(ev.action, scene.agentAt(column * SEGMENT + ev.payload.tapPos[0]));
	}

	async #focus(action: DialAction<JsonObject>, agent: Agent | undefined): Promise<void> {
		if (!agent) {
			await action.showAlert();
			return;
		}
		try {
			await focusAgent(agent.paneId);
			await state.refresh();
		} catch (err) {
			streamDeck.logger.error(`focus ${agent.paneId} failed: ${err}`);
			await action.showAlert();
		}
	}

	#dials(): DialAction<JsonObject>[] {
		return [...this.actions].filter((a): a is DialAction<JsonObject> => a.isDial());
	}

	#scene(deviceId: string): Scene {
		let entry = this.#scenes.get(deviceId);
		if (!entry || entry.themeId !== state.theme.id) {
			entry = { themeId: state.theme.id, scene: state.theme.scene.fork() };
			this.#scenes.set(deviceId, entry);
		}
		return entry.scene;
	}

	#render(): void {
		const dials = this.#dials();
		if (dials.length === 0) return;

		// The corral animates at half the key frame rate; data changes still render immediately.
		const step = Math.floor(state.frame / 2);
		const look = `${state.theme.id}:${state.themeBanner}:${state.layoutVersion}:${state.error}:${state.theme.id === "raid" ? raidRound.view.round : ""}`;
		if (
			step === this.#lastStep &&
			state.agents === this.#lastAgents &&
			state.page === this.#lastPage &&
			look === this.#lastLook
		) {
			return;
		}
		this.#lastStep = step;
		this.#lastAgents = state.agents;
		this.#lastPage = state.page;
		this.#lastLook = look;

		for (const deviceId of new Set(dials.map((a) => a.device.id))) {
			const scene = this.#scene(deviceId).render(state.error ? [] : state.visible(deviceId), step);
			if (state.error) {
				scene.rect(0, 30, WIDTH, 22, P.black, 0.6);
				drawTextCentered(scene, "HERDR IS DOWN - EVERYONE WENT HOME", 36, 2, P.white, undefined, FONT_3X5);
			} else if (state.pageCount > 1) {
				const pager = `KEYS ${state.page + 1}/${state.pageCount}`;
				drawText(scene, pager, WIDTH - textWidth(pager, 2, FONT_3X5) - 6, HEIGHT - 14, 2, P.silver, P.black, FONT_3X5);
			}

			const banner = state.themeBanner;
			if (banner) {
				const w = textWidth(banner, 3, FONT_5X7) + 24;
				const x = Math.round((WIDTH - w) / 2);
				scene.rect(x, 30, w, 36, P.black, 0.75);
				scene.rect(x, 30, w, 2, P.yellow);
				scene.rect(x, 64, w, 2, P.yellow);
				drawTextCentered(scene, banner, 38, 3, P.white, P.black, FONT_5X7);
			}

			for (const action of dials.filter((a) => a.device.id === deviceId)) {
				const column = Math.max(0, Math.min(3, action.coordinates.column));
				const image = scene.crop(column * SEGMENT, 0, SEGMENT, HEIGHT).toDataUrl();
				if (this.#images.get(action.id) === image) continue;
				this.#images.set(action.id, image);
				void action.setFeedback({ canvas: image });
			}
		}
	}
}
