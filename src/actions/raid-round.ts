import { type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { raidRound } from "../raid";
import { state } from "../state";
import { raidControl } from "../themes/raid";

/** Separate control: never replaces the normal agent key/dial focus gestures. */
export class RaidAction extends SingletonAction {
 override readonly manifestId = "dev.fedeya.corral.raid";
 #unsubscribe: (() => void) | null = null;
 #images = new Map<string, string>();

 override onWillAppear(): void {
  this.#unsubscribe ??= state.subscribe(() => this.#render());
  this.#render();
 }

 override onWillDisappear(): void {
  queueMicrotask(() => {
   if ([...this.actions].length === 0) {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#images.clear();
   }
  });
 }

 override async onKeyDown(ev: KeyDownEvent): Promise<void> {
  if (await state.startRaidRound()) await ev.action.showOk();
  else await ev.action.showAlert();
 }

 #render(): void {
  const image = raidControl(raidRound, state.frame).toDataUrl();
  for (const action of this.actions) {
   if (!action.isKey() || this.#images.get(action.id) === image) continue;
   this.#images.set(action.id, image);
   void action.setImage(image);
  }
 }
}
