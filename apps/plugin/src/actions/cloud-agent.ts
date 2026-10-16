import streamDeck, { SingletonAction, type KeyDownEvent, type KeyUpEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import { cursorCloud, type CursorCloud } from "../cursor-cloud";
import { renderCloudKey } from "../cloud-render";
import { state } from "../state";

/** Optional, read-only key. Only a deliberate permitted release opens the configured agent. */
export class CloudAgent extends SingletonAction {
 override readonly manifestId = "dev.fedeya.corral.cloud";
 #unsubscribe: (() => void) | null = null;
 #unpresent: (() => void) | null = null;
 #disconnect: { dispose(): void } | null = null;
 #presses = new Map<string, () => boolean>();
 #epochs = new Map<string, number>();
 #lifetime = 0;
 constructor(readonly cloud: CursorCloud = cursorCloud, readonly openUrl: (url: string) => Promise<unknown> = url => streamDeck.system.openUrl(url)) { super(); }
 override onWillAppear(): void {
  this.#unsubscribe ??= this.cloud.subscribe(() => this.#render());
  this.#unpresent ??= state.subscribePresentation(() => this.#render());
  this.#disconnect ??= streamDeck.devices?.onDeviceDidDisconnect(({ device }) => {
   // SDK action membership survives device disconnect; revoke the whole press epoch.
   for (const action of this.actions) if (action.device.id === device.id) {
    this.#presses.delete(action.id);
    this.#epochs.set(action.id, (this.#epochs.get(action.id) ?? 0) + 1);
   }
  }) ?? null;
  this.#render();
 }
 override onWillDisappear(ev?: WillDisappearEvent): void {
  if (ev) { this.#presses.delete(ev.action.id); this.#epochs.set(ev.action.id, (this.#epochs.get(ev.action.id) ?? 0) + 1); }
  queueMicrotask(() => {
   if ([...this.actions].length !== 0) return;
   this.#lifetime++; this.#presses.clear(); this.#epochs.clear();
   this.#unsubscribe?.(); this.#unsubscribe = null;
   this.#unpresent?.(); this.#unpresent = null;
   this.#disconnect?.dispose(); this.#disconnect = null;
  });
 }
 override onKeyDown(ev: KeyDownEvent): void {
  this.#presses.delete(ev.action.id);
  if (!state.canFocus || ev.action.device?.isConnected === false) return;
  const permission = state.focusPermission(), epoch = this.#epochs.get(ev.action.id) ?? 0;
  const lifetime = this.#lifetime;
  this.#presses.set(ev.action.id, () => permission() && ev.action.device?.isConnected !== false && lifetime === this.#lifetime && (this.#epochs.get(ev.action.id) ?? 0) === epoch && [...this.actions].some(action => action.id === ev.action.id));
 }
 override async onKeyUp(ev: KeyUpEvent): Promise<void> {
  const allowed = this.#presses.get(ev.action.id); this.#presses.delete(ev.action.id);
  if (!allowed?.()) return;
  if (!await this.cloud.open(allowed, this.openUrl) && allowed()) await ev.action.showAlert();
 }
 #render(): void {
  const image = renderCloudKey(this.cloud.snapshot, state.showcase);
  for (const action of this.actions) if (action.isKey()) void action.setImage(image);
 }
}
