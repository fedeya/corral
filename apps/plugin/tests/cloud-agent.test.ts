import { mock } from "bun:test";
import { test } from "node:test";
import assert from "node:assert/strict";
process.env.CORRAL_IMGS = `${process.cwd()}/dev.fedeya.corral.sdPlugin/imgs`;
type DisconnectListener = (event: { device: { id: string } }) => void;
const disconnectListeners = new Set<DisconnectListener>();
mock.module("@elgato/streamdeck", () => ({
 default: { system: { openUrl: async () => {} }, settings: { getGlobalSettings: async () => ({}), setGlobalSettings: async () => {} }, logger: { warn() {}, error() {} },
  devices: { onDeviceDidDisconnect: (listener: DisconnectListener) => { disconnectListeners.add(listener); return { dispose: () => { disconnectListeners.delete(listener); } }; } } },
 SingletonAction: class { actions: unknown[] = []; },
}));
const { CursorCloud } = await import("../src/cursor-cloud");
const { CloudAgent } = await import("../src/actions/cloud-agent");
const { renderCloudKey, drawCloudStrip } = await import("../src/cloud-render");
const { Canvas } = await import("../src/pixel");
const { state } = await import("../src/state");
import fixture from "./fixtures/cursor-cloud.json";
const { agent } = fixture;
const run = { ...fixture.run, status: "RUNNING" };
const id = agent.id;

async function disconnectedKey(duringRefresh: boolean, reconnect = false): Promise<void> {
 let delay = false, release: (() => void) | undefined;
 const opened: string[] = [];
 const cloud = new CursorCloud({ agentId: id, apiKey: "offline-test", fetch: async url => {
  if (delay && !url.includes("/runs/")) await new Promise<void>(resolve => { release = resolve; });
  return Response.json(url.includes("/runs/") ? run : agent);
 } });
 const controller = new CloudAgent(cloud, async url => { opened.push(url); });
 const key = { id: "disconnect-key", device: { id: "disconnect-deck", isConnected: true }, isKey: () => true, setImage: async () => {}, showAlert: async () => {} };
 const descriptors = Object.getOwnPropertyDescriptors(state);
 Object.defineProperties(state, { canFocus: { configurable: true, get: () => true }, focusPermission: { configurable: true, value: () => () => true } });
 Object.defineProperty(controller, "actions", { configurable: true, value: [key] });
 try {
  controller.onWillAppear(); await cloud.refresh();
  controller.onKeyDown({ action: key } as never);
  let pending: Promise<void> | undefined;
  if (duringRefresh) { delay = true; pending = controller.onKeyUp({ action: key } as never); assert.ok(release); }
  key.device.isConnected = false;
  for (const listener of disconnectListeners) listener({ device: key.device });
  if (reconnect) key.device.isConnected = true;
  if (duringRefresh) { release!(); await pending; }
  else await controller.onKeyUp({ action: key } as never);
  assert.deepEqual(opened, [], "device disconnect must revoke the press even when its SDK action remains stored");
 } finally {
  Object.defineProperty(controller, "actions", { value: [] }); controller.onWillDisappear();
  await new Promise<void>(resolve => queueMicrotask(resolve)); cloud.dispose(); Object.defineProperties(state, descriptors);
 }
}
test("a cloud release cannot open after its still-stored SDK device disconnects", () => disconnectedKey(false));
test("a cloud refresh cannot finish opening after device disconnect", () => disconnectedKey(true));
test("reconnecting a cloud device cannot revive an in-flight press", () => disconnectedKey(true, true));

test("real cloud key and strip redact canonical captions in Showcase and reserve only left overlay", () => {
 const snapshot = { configured: true, status: "working" as const, label: "SECRET CLIENT", url: agent.url, error: "PRIVATE ERROR" };
 const other = { ...snapshot, label: "ANOTHER SECRET", url: "https://evil.test", error: "OTHER PRIVATE" };
 assert.notEqual(renderCloudKey(snapshot, false), renderCloudKey(other, false));
 assert.equal(renderCloudKey(snapshot, true), renderCloudKey(other, true));
 const scene = new Canvas(800, 100); drawCloudStrip(scene, snapshot, true);
 const comparison = new Canvas(800, 100); drawCloudStrip(comparison, other, true);
 assert.deepEqual(scene.data, comparison.data);
 for (let y = 0; y < 100; y++) for (let x = 0; x < 800; x++) {
  if (x < 200 && y >= 40 && y <= 65) continue;
  assert.equal(scene.data[(y * 800 + x) * 4 + 3], 0);
 }
 const empty = new Canvas(800, 100); drawCloudStrip(empty, { configured: false, status: "unavailable", label: "CLOUD AGENT" }, false);
 assert.equal(empty.data.every(byte => byte === 0), true);
});

test("native strip receives cloud updates with empty local roster/herdr down and cloud overlay is not tappable", async () => {
 const { AgentsDial } = await import("../src/actions/agents-dial");
 const { PNG } = await import("pngjs");
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => Response.json(url.includes("/runs/") ? run : agent) });
 const descriptors = Object.getOwnPropertyDescriptors(state);
 const feedback: string[] = []; let alerts = 0;
 const dial = { id: "strip-cloud", device: { id: "cloud-device" }, coordinates: { column: 0, row: 0 }, isDial: () => true,
  setFeedback: async (f: { canvas: string }) => { feedback.push(f.canvas); }, showAlert: async () => { alerts++; } };
 Object.defineProperties(state, {
  subscribe: { configurable: true, value: () => () => {} }, agents: { configurable: true, get: () => [] },
  frame: { configurable: true, get: () => 0 }, error: { configurable: true, get: () => "herdr off" },
  themeBanner: { configurable: true, get: () => null }, canFocus: { configurable: true, get: () => true },
 });
 const strip = new AgentsDial(cloud);
 Object.defineProperty(strip, "actions", { configurable: true, value: [dial] });
 try {
  strip.onWillAppear(); const initial = feedback.at(-1);
  await cloud.refresh(); assert.notEqual(feedback.at(-1), initial);
  const png = PNG.sync.read(Buffer.from(feedback.at(-1)!.split(",")[1]!, "base64"));
  const actual = new Canvas(png.width, png.height); png.data.copy(actual.data);
  const expected = new Canvas(800, 100); drawCloudStrip(expected, cloud.snapshot, state.showcase);
  assert.deepEqual(actual.crop(0, 40, 200, 26).data, expected.crop(0, 40, 200, 26).data);
  await strip.onTouchTap({ action: dial, payload: { tapPos: [30, 50] } } as never);
  assert.equal(alerts, 0);
 } finally {
  Object.defineProperty(strip, "actions", { value: [] }); strip.onWillDisappear();
  await new Promise<void>(resolve => queueMicrotask(resolve)); cloud.dispose(); Object.defineProperties(state, descriptors);
 }
});

test("a removed/reappearing cloud key cannot revive an in-flight open while another subscriber remains", async () => {
 let gate: (() => void) | undefined, delayed = false; const opened: string[] = [];
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => {
  if (delayed && !url.includes("/runs/")) await new Promise<void>(resolve => { gate = resolve; });
  return Response.json(url.includes("/runs/") ? run : agent);
 } });
 const other = cloud.subscribe(() => {}); await cloud.refresh();
 const action = new CloudAgent(cloud, async url => { opened.push(url); });
 const key = { id: "reappearing-cloud", isKey: () => true, setImage: async () => {}, showAlert: async () => {} };
 const actions = (value: unknown[]) => Object.defineProperty(action, "actions", { configurable: true, value });
 const descriptors = Object.getOwnPropertyDescriptors(state);
 Object.defineProperties(state, { canFocus: { configurable: true, get: () => true }, focusPermission: { configurable: true, value: () => () => true } });
 try {
  actions([key]); action.onWillAppear(); await cloud.refresh();
  delayed = true; action.onKeyDown({ action: key } as never); const pending = action.onKeyUp({ action: key } as never);
  actions([]); action.onWillDisappear({ action: key } as never); await new Promise<void>(resolve => queueMicrotask(resolve));
  actions([key]); action.onWillAppear(); delayed = false; gate!(); await pending;
  assert.deepEqual(opened, []);
 } finally {
  actions([]); action.onWillDisappear(); await new Promise<void>(resolve => queueMicrotask(resolve)); other(); cloud.dispose(); Object.defineProperties(state, descriptors);
 }
});

test("native cloud key reacts without herdr subscribers, opens only on release and revokes camera presses", async () => {
 let requests = 0, image = ""; const opened: string[] = [];
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => { requests++; return Response.json(url.includes("/runs/") ? run : agent); } });
 const action = new CloudAgent(cloud, async url => { opened.push(url); });
 const key = { id: "cloud", isKey: () => true, setImage: async (s: string) => { image = s; }, showAlert: async () => {} };
 const setActions = (value: unknown[]) => Object.defineProperty(action, "actions", { configurable: true, value });
 type Press = Parameters<typeof action.onKeyDown>[0];
 const press = { action: key } as unknown as Press;
 const originalSubscribe = state.subscribe;
 state.subscribe = () => { throw new Error("Cloud key must not depend on herdr polling"); };
 const now = Date.now;
 try {
  Date.now = () => now() + 10000;
  setActions([key]); action.onWillAppear(); const initial = image;
  await cloud.refresh(); assert.ok(image); assert.notEqual(image, initial); assert.equal(requests, 2);
  action.onKeyDown(press); assert.equal(opened.length, 0); await action.onKeyUp(press as unknown as Parameters<typeof action.onKeyUp>[0]); assert.deepEqual(opened, [agent.url]);
  action.onKeyDown(press); state.toggleShowcase(); const camera = image;
  assert.equal(camera, renderCloudKey(cloud.snapshot, true));
  state.toggleShowcase(); Date.now = () => now() + 20000;
  await action.onKeyUp(press as unknown as Parameters<typeof action.onKeyUp>[0]); assert.equal(opened.length, 1);
  state.toggleShowcase(); action.onKeyDown(press); state.toggleShowcase(); Date.now = () => now() + 30000;
  await action.onKeyUp(press as unknown as Parameters<typeof action.onKeyUp>[0]); assert.equal(opened.length, 1);
  action.onKeyDown(press); setActions([]); action.onWillDisappear({ action: key } as never); await action.onKeyUp(press as unknown as Parameters<typeof action.onKeyUp>[0]);
  assert.equal(opened.length, 1);
 } finally {
  Date.now = now; state.subscribe = originalSubscribe; if (state.showcase) state.toggleShowcase();
  setActions([]); action.onWillDisappear(); await new Promise<void>(resolve => queueMicrotask(resolve)); cloud.dispose();
 }
});
