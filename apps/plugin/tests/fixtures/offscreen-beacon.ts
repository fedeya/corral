import assert from "node:assert/strict";
import { chmodSync, copyFileSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = mkdtempSync(join(process.env.TMPDIR!, "corral-beacon-sdk-"));
process.chdir(dir); // The real SDK writes logs relative to cwd, never into the repository.
copyFileSync(new URL("../../dev.fedeya.corral.sdPlugin/manifest.json", import.meta.url), join(dir, "manifest.json"));
const cli = join(dir, "herdr");
copyFileSync(new URL("./herdr.cjs", import.meta.url), cli);
chmodSync(cli, 0o755);
process.env.HERDR_BIN_PATH = cli;
process.env.CORRAL_TEST_ROSTER = join(dir, "roster.json");
process.env.CORRAL_TEST_FOCUS = join(dir, "focus");
process.env.CORRAL_IMGS = new URL("../../dev.fedeya.corral.sdPlugin/imgs", import.meta.url).pathname;
writeFileSync(process.env.CORRAL_TEST_FOCUS, "");
const raw = (pane_id: string, agent_status = "blocked", state_change_seq = 0) => ({
	pane_id, workspace_id: pane_id, name: `PRIVATE ${pane_id}`, cwd: `SECRET-${pane_id}`,
	agent_status, state_change_seq,
});
const roster = (agents: ReturnType<typeof raw>[]) => writeFileSync(process.env.CORRAL_TEST_ROSTER!, JSON.stringify(agents));
async function main() {
const { state } = await import("../../src/state");
const refresh = async () => { await state.refresh(); await state.refresh(); };

roster([raw("a"), raw("b"), raw("b"), raw("c", "working")]);
await refresh();
state.setSlots([
	{ id: "one-key", deviceId: "one", column: 3, row: 0 },
	{ id: "two-key", deviceId: "two", column: 3, row: 0 },
]);
assert.equal(state.togglePin("one-key", "a"), true);
assert.equal(state.togglePin("two-key", "b"), true);
assert.equal(state.pageCount, 1, "all keys are pinned");
assert.deepEqual(state.offscreenBlocked("one").map((a) => a.paneId), ["b"]);
assert.deepEqual(state.offscreenBlocked("two").map((a) => a.paneId), ["a"]);
assert.deepEqual(state.offscreenBlocked("no-keys-on-this-device").map((a) => a.paneId), ["a", "b"]);
state.toggleShowcase();
assert.deepEqual(state.offscreenBlocked("one").map((a) => a.workspace), ["AGENT B"]);
assert.equal(state.agents[1]?.workspace, "SECRET-b", "projection must not mutate canonical roster");
state.toggleShowcase();
renameSync(cli, `${cli}.offline`);
await refresh();
assert.equal(state.error, "herdr off");
assert.deepEqual(state.offscreenBlocked("one"), [], "a stale roster cannot advertise actionable targets offline");
renameSync(`${cli}.offline`, cli);
await refresh();
assert.deepEqual(state.offscreenBlocked("one").map((a) => a.paneId), ["b"]);
console.log("real SDK state fixture: device-local distinct blocked candidates, all-pinned, projection, offline PASS");

const sdkRoot = new URL(".", import.meta.resolve("@elgato/streamdeck"));
const { connection } = await import(new URL("connection.js", sdkRoot).href);
const { default: streamDeck } = await import("@elgato/streamdeck");
const { DialAction } = await import(new URL("actions/dial.js", sdkRoot).href);
const { AgentsDial } = await import("../../src/actions/agents-dial");
const { Canvas } = await import("../../src/pixel");
const { drawBlockedBeacon } = await import("../../src/offscreen-beacon");
const { PNG } = await import("pngjs");
const sent: { event: string; context?: string; payload?: { canvas?: string } }[] = [];
connection._registrationParameters = { pluginUUID: "fixture", info: { application: { version: "7.1" } } };
connection.send = async (command: typeof sent[number]) => { sent.push(command); };
// Avoid wall-clock/timer races while retaining the real state, SDK routing, and CLI boundary.
let render = () => {};
Object.defineProperties(state, {
	frame: { configurable: true, get: () => 0 },
	themeBanner: { configurable: true, get: () => null },
	subscribe: { configurable: true, value: (listener: () => void) => { render = listener; return () => { render = () => {}; }; } },
});
const now = Date.now;
Date.now = () => now() + 10_000;
class FixtureDial extends AgentsDial {
	lastTap = Promise.resolve();
	override onTouchTap(ev: import("@elgato/streamdeck").TouchTapEvent): Promise<void> {
		return this.lastTap = super.onTouchTap(ev);
	}
}
const strip = new FixtureDial();
streamDeck.actions.registerAction(strip);
for (const device of ["one", "two"]) {
	connection.emit("deviceDidConnect", { device, deviceInfo: { name: device, type: 7, size: { columns: 4, rows: 2 } } });
	connection.emit("willAppear", { event: "willAppear", action: strip.manifestId, context: `${device}-dial`, device,
		payload: { controller: "Encoder", coordinates: { column: 3, row: 0 }, settings: {} } });
}
assert.ok(streamDeck.actions.getActionById("one-dial") instanceof DialAction);
const image = (device: string) => {
	const url = sent.filter((command) => command.event === "setFeedback" && command.context === `${device}-dial`).at(-1)?.payload?.canvas;
	assert.ok(url, `real SDK feedback for ${device}`);
	const png = PNG.sync.read(Buffer.from(url.split(",")[1]!, "base64"));
	const canvas = new Canvas(png.width, png.height); png.data.copy(canvas.data); return canvas;
};
for (const [device, target] of [["one", "b"], ["two", "a"]] as const) {
	const expected = new Canvas(800, 100);
	drawBlockedBeacon(expected, { count: 1, agent: state.offscreenBlocked(device).find((agent) => agent.paneId === target)! }, 0);
	assert.deepEqual(image(device).crop(0, 40, 200, 26).data, expected.crop(600, 40, 200, 26).data, "real SDK feedback contains the exact device's banner");
}
const tap = async (device: string, x: number, y: number, hold = false) => {
	connection.emit("touchTap", { event: "touchTap", action: strip.manifestId, context: `${device}-dial`, device,
		payload: { controller: "Encoder", coordinates: { column: 3, row: 0 }, settings: {}, tapPos: [x, y], hold } });
	await strip.lastTap;
};
await tap("one", 0, 40);
await tap("two", 199, 65);
const focusLog = () => readFileSync(process.env.CORRAL_TEST_FOCUS!, "utf8");
assert.equal(focusLog(), "b\na\n", "native banner taps must focus the device-specific offscreen target, never the visible character");
await tap("one", 100, 50, true);
assert.equal(focusLog(), "b\na\n", "holding the banner never focuses or falls through to a visible character");
connection.emit("deviceDidDisconnect", { device: "one" });
await tap("one", 100, 50);
assert.equal(focusLog(), "b\na\n", "a disconnected device's queued tap cannot focus");
connection.emit("deviceDidConnect", { device: "one", deviceInfo: { name: "one", type: 7, size: { columns: 4, rows: 2 } } });

// Reordering and duplicate rows change counts, never the selected pane identity.
roster([raw("c", "blocked", 100), raw("b"), raw("b"), raw("a")]);
await refresh(); render();
const expectedBeacon = (device: string, target: string, count: number) => {
	const expected = new Canvas(800, 100);
	drawBlockedBeacon(expected, { count, agent: state.offscreenBlocked(device).find((agent) => agent.paneId === target)! }, 0);
	assert.ok(image(device).crop(0, 40, 200, 26).data.equals(expected.crop(600, 40, 200, 26).data), `banner count/label on ${device}`);
};
expectedBeacon("one", "b", 2);
expectedBeacon("two", "a", 2);
await tap("one", 100, 50);
assert.equal(focusLog(), "b\na\nb\n", "priority changes retain the pane displayed in the banner");

const beforeGuards = focusLog();
for (const status of ["working", "done", "idle", "unknown"]) {
	roster([raw("c", "blocked", 100), raw("b", status), raw("a")]);
	await refresh();
	await tap("one", 100, 50);
	assert.equal(focusLog(), beforeGuards, `stale banner cannot focus a ${status} pane or redirect to c/a`);
}
roster([raw("a"), raw("c")]);
await refresh();
await tap("one", 100, 50);
assert.equal(focusLog(), beforeGuards, "vanished banner target cannot redirect to another blocked or visible pane");
roster([raw("a"), raw("b"), raw("c")]);
await refresh(); render();
// The selected pane has now changed only because a new banner was actually drawn.
expectedBeacon("one", "b", 2);
state.togglePin("one-key");
state.turnPage(-state.page);
// With a free key, the former offscreen target can become visible before another render.
state.turnPage(1);
assert.equal(state.visible("one")[0]?.agent.paneId, "c");
// Restore b's banner explicitly and then move b onto this device's key.
state.turnPage(-state.page);
render();
state.togglePin("two-key");
state.togglePin("one-key", "b");
await tap("one", 100, 50);
assert.equal(focusLog(), beforeGuards, "banner taps revalidate device-local visibility even with a stale rendered target");
state.togglePin("one-key"); state.togglePin("one-key", "a");
state.togglePin("two-key", "b");
render();

state.toggleShowcase(); render();
expectedBeacon("one", "b", 2);
assert.match(state.offscreenBlocked("one")[0]!.workspace, /^AGENT [A-Z]+$/);
const { showcaseMarker } = await import("../../src/render");
const camera = new Canvas(200, 100); showcaseMarker(camera, 0, 89, 200);
assert.ok(image("one").crop(3, 89, 194, 11).data.equals(camera.crop(3, 89, 194, 11).data), "beacon never overwrites the camera badge");
await tap("one", 100, 50);
assert.equal(focusLog(), beforeGuards, "showcase banner is visible but cannot focus or fall through");
state.toggleShowcase(); render();
await tap("one", 100, 50);
assert.equal(focusLog(), beforeGuards, "resume-tail banner taps cannot focus or fall through");
Date.now = () => now() + 20_000;
renameSync(cli, `${cli}.offline`);
await refresh();
await tap("one", 100, 50);
assert.equal(focusLog(), beforeGuards, "herdr-offline stale banner cannot focus or fall through");
renameSync(`${cli}.offline`, cli);
await refresh(); render();
// Ordinary short touches immediately outside the y bounds still use the character path.
await tap("one", 100, 39);
await tap("one", 100, 66);
assert.equal(focusLog(), beforeGuards + "a\na\n", "ordinary short touches outside the exact rectangle are unchanged");
const beforeInvalid = focusLog();
for (const [x, y] of [[100, -1], [100, 100], [-1, 50], [200, 50], [NaN, 50], [100, NaN]]) {
	await tap("one", x!, y!);
}
assert.equal(focusLog(), beforeInvalid, "invalid SDK-local coordinates cannot hit the banner or fall through to a character");

// Exercise the existing epoch permission and post-focus refresh through the beacon path.
let checks = 0;
const permission = state.focusPermission.bind(state);
state.focusPermission = () => {
	const allowed = permission();
	return () => {
		checks++;
		if (checks === 2) { state.toggleShowcase(); state.toggleShowcase(); Date.now = () => now() + 30_000; }
		return allowed();
	};
};
const previousRoster = state.agents;
await tap("one", 100, 50);
assert.equal(checks, 2, "beacon uses the existing focusAgent permission checks across the CLI boundary");
assert.equal(state.canFocus, true, "quarantine expired, but the captured permission epoch remains revoked");
assert.notEqual(state.agents, previousRoster, "beacon focus awaits a real roster refresh");
state.focusPermission = permission;

for (const device of ["one", "two"]) connection.emit("willDisappear", { event: "willDisappear", action: strip.manifestId, context: `${device}-dial`, device,
	payload: { controller: "Encoder", coordinates: { column: 3, row: 0 }, settings: {} } });
await new Promise<void>((resolve) => queueMicrotask(resolve));
Date.now = now;
console.log("real SDK tap fixture: exact per-device feedback, stable target, hold/offline/Showcase/epoch guards, refresh, ordinary taps PASS");
}
await main().catch((error: unknown) => { console.error(error); process.exit(1); });
