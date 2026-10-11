import type { JsonObject } from "@elgato/utils";
import streamDeck, {
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	type WillDisappearEvent,
	SingletonAction,
} from "@elgato/streamdeck";
import { focusAgent } from "../herdr";
import { renderKey } from "../themes";
import { state } from "../state";
import { KeyGestures } from "../gestures";

export class AgentSlot extends SingletonAction {
	override readonly manifestId = "dev.fedeya.corral.slot";

	#unsubscribe: (() => void) | null = null;
	#images = new Map<string, string>();

	override onWillAppear(): void {
		this.#unsubscribe ??= state.subscribe(() => this.#render());
		this.#render();
	}

	override onWillDisappear(ev: WillDisappearEvent): void {
		this.#gestures.cancel(ev.action.id);
		this.#focusPermissions.delete(ev.action.id);
		this.#images.delete(ev.action.id);
		queueMicrotask(() => {
			this.#render();
			if (this.#slots().length === 0) {
				this.#unsubscribe?.();
				this.#unsubscribe = null;
				this.#images.clear();
			}
		});
	}

	#gestures = new KeyGestures();
	#focusPermissions = new Map<string, () => boolean>();

	override onKeyDown(ev: KeyDownEvent): void {
		const slot = this.#slots().findIndex((a) => a.id === ev.action.id);
		const agent = slot < 0 ? undefined : state.agentAt(slot);
		if (!this.#focusPermissions.has(ev.action.id)) {
			const canFocus = state.canFocus;
			const permission = state.focusPermission();
			this.#focusPermissions.set(ev.action.id, () => canFocus && permission());
		}
		this.#gestures.down(ev.action.id, agent?.paneId);
	}

	override async onKeyUp(ev: KeyUpEvent): Promise<void> {
		const gesture = this.#gestures.up(ev.action.id);
		const permission = this.#focusPermissions.get(ev.action.id);
		this.#focusPermissions.delete(ev.action.id);
		if (!gesture) return;
		if (gesture.kind === "pin") {
			if (!state.togglePin(ev.action.id, gesture.paneId)) await ev.action.showAlert();
			return;
		}
		if (!permission?.()) return;
		const paneId = gesture.paneId;
		if (!paneId || state.error || !state.agents.some((a) => a.paneId === paneId)) {
			await ev.action.showAlert();
			return;
		}
		try {
			await focusAgent(paneId, permission);
			await state.refresh();
		} catch (err) {
			streamDeck.logger.error(`focus ${paneId} failed: ${err}`);
			await ev.action.showAlert();
		}
	}

	#slots(): KeyAction<JsonObject>[] {
		return [...this.actions]
			.filter((a): a is KeyAction<JsonObject> => a.isKey() && !a.isInMultiAction() && a.coordinates !== undefined)
			.sort(
				(a, b) =>
					a.device.id.localeCompare(b.device.id) ||
					a.coordinates!.row - b.coordinates!.row ||
					a.coordinates!.column - b.coordinates!.column,
			);
	}

	#render(): void {
		const slots = this.#slots();
		state.setSlots(
			slots.map((a) => ({
				id: a.id,
				deviceId: a.device.id,
				column: a.coordinates!.column,
				row: a.coordinates!.row,
			})),
		);
		const resolved = state.resolved();
		slots.forEach((action, i) => {
			const image = renderKey(state.theme, state.displayAgentAt(i), state.frame, state.error, resolved[i]?.pinned, state.showcase);
			if (this.#images.get(action.id) === image) return;
			this.#images.set(action.id, image);
			void action.setImage(image);
		});
	}
}
