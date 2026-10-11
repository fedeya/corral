import { SingletonAction } from "@elgato/streamdeck";
import { Canvas, drawTextCentered, FONT_3X5 } from "../pixel";
import { P, SIZE, showcaseMarker } from "../render";
import { state } from "../state";

/** Optional dedicated key: no focus gesture is shared with this control. */
export class ShowcaseToggle extends SingletonAction {
	override readonly manifestId = "dev.fedeya.corral.showcase";
	#unsubscribe: (() => void) | null = null;
	override onWillAppear(): void {
		this.#unsubscribe ??= state.subscribe(() => this.#render());
		this.#render();
	}
	override onWillDisappear(): void {
		queueMicrotask(() => {
			if ([...this.actions].length === 0) {
				this.#unsubscribe?.();
				this.#unsubscribe = null;
			}
		});
	}
	override onKeyDown(): void {
		state.toggleShowcase();
	}
	#render(): void {
		const c = new Canvas(SIZE, SIZE);
		c.rect(0, 0, SIZE, SIZE, P.navy);
		c.rect(27, 27, 50, 33, state.showcase ? P.yellow : P.silver);
		c.rect(79, 22, 14, 43, state.showcase ? P.yellow : P.silver);
		c.rect(37, 35, 20, 17, P.navy);
		drawTextCentered(c, state.showcase ? "CAMERA ON" : "CAMERA OFF", 78, 2, P.white, undefined, FONT_3X5);
		showcaseMarker(c);
		const image = c.toDataUrl();
		for (const action of this.actions) if (action.isKey()) void action.setImage(image);
	}
}
