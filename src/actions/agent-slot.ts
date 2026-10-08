import type { JsonObject } from "@elgato/utils";
import streamDeck, { type KeyAction, type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { focusAgent } from "../herdr";
import { renderKey } from "../themes";
import { state } from "../state";

export class AgentSlot extends SingletonAction {
	override readonly manifestId = "dev.fedeya.corral.slot";

	#unsubscribe: (() => void) | null = null;
	#images = new Map<string, string>();

	override onWillAppear(): void {
		this.#unsubscribe ??= state.subscribe(() => this.#render());
		this.#render();
	}

	override onWillDisappear(): void {
		queueMicrotask(() => {
			if (this.#slots().length === 0) {
				this.#unsubscribe?.();
				this.#unsubscribe = null;
				this.#images.clear();
			}
		});
	}

	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		const slot = this.#slots().findIndex((a) => a.id === ev.action.id);
		const agent = state.agentAt(slot);
		if (slot < 0 || !agent) {
			await ev.action.showAlert();
			return;
		}
		try {
			await focusAgent(agent.paneId);
			await state.refresh();
		} catch (err) {
			streamDeck.logger.error(`focus ${agent.paneId} failed: ${err}`);
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
		state.setSlots(slots.map((a) => ({ column: a.coordinates!.column, row: a.coordinates!.row })));
		slots.forEach((action, i) => {
			const image = renderKey(state.theme, state.agentAt(i), state.frame, state.error);
			if (this.#images.get(action.id) === image) return;
			this.#images.set(action.id, image);
			void action.setImage(image);
		});
	}
}
