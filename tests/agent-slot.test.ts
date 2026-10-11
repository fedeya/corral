import { test, after as afterAll } from "node:test";
// Runtime-only Bun mocking; keep tests typechecked against Node's test APIs.
const bunTestModule = "bun:test";
const { mock } = await import(bunTestModule);
import assert from "node:assert/strict";
import { mkdtempSync, copyFileSync, chmodSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
const root = process.env.TMPDIR ?? "/root/.hermes/cache/scratch";
const dir = mkdtempSync(join(root, "corral-pins-test-"));
const cli = join(dir, "herdr");
copyFileSync(new URL("./fixtures/herdr.cjs", import.meta.url), cli);
chmodSync(cli, 0o755);
process.env.HERDR_BIN_PATH = cli;
process.env.CORRAL_TEST_FOCUS = join(dir, "focus");
process.env.CORRAL_TEST_ROSTER = join(dir, "roster.json");
process.env.CORRAL_IMGS = join(import.meta.dirname, "../dev.fedeya.corral.sdPlugin/imgs");
writeFileSync(process.env.CORRAL_TEST_FOCUS, "");
const roster = (ids: string[]) =>
	writeFileSync(
		process.env.CORRAL_TEST_ROSTER!,
		JSON.stringify(
			ids.map((id, i) => ({
				pane_id: id,
				workspace_id: id,
				cwd: id,
				agent_status: "working",
				state_change_seq: ids.length - i,
			})),
		),
	);
roster(["A", "B"]);
class Dispatch {
	actions: any[] = [];
	async dispatch(name: string, action: any, payload: any = {}) {
		return (this as any)[name]?.({ action, payload });
	}
}
mock.module("@elgato/streamdeck", () => ({
	SingletonAction: Dispatch,
	default: {
		logger: { warn() {}, error() {} },
		settings: {
			getGlobalSettings: async () => ({}),
			setGlobalSettings: async () => {},
		},
	},
}));
const { AgentSlot } = await import("../src/actions/agent-slot");
const { state } = await import("../src/state");
const action = (id: string, column: number) => ({
	id,
	device: { id: "deck" },
	coordinates: { column, row: 0 },
	isKey: () => true,
	isInMultiAction: () => false,
	images: [] as string[],
	alerts: 0,
	async setImage(image: string) {
		this.images.push(image);
	},
	async showAlert() {
		this.alerts++;
	},
});
const keys = [action("k1", 0), action("k2", 1)];
const plugin = new AgentSlot() as unknown as Omit<InstanceType<typeof AgentSlot>, "actions"> & Dispatch;
plugin.actions = keys;
const focuses = () => readFileSync(process.env.CORRAL_TEST_FOCUS!, "utf8");
async function refreshFixture(): Promise<void> {
	// Drain a background poll that may have read the previous fixture, then request a fresh snapshot.
	// refresh() deliberately shares in-flight work; it does not promise to start a new poll.
	await state.refresh();
	await state.refresh();
}
test("concurrent refresh callers wait for the real roster result", async () => {
	const first = state.refresh();
	await state.refresh();
	assert.equal(state.agents.length, 2);
	await first;
});
test("SDK strip updates immediately when pinning rearranges keys in the same frame", async () => {
	roster(["B", "A"]);
	await refreshFixture();
	plugin.onWillAppear();
	const { AgentsDial } = await import("../src/actions/agents-dial");
	const strip = new AgentsDial() as unknown as Omit<InstanceType<typeof AgentsDial>, "actions"> & Dispatch;
	const dial = {
		id: "dial",
		device: { id: "deck" },
		coordinates: { column: 0 },
		isDial: () => true,
		images: [] as string[],
		async setFeedback(feedback: any) {
			this.images.push(feedback.canvas);
		},
		async showAlert() {},
	};
	strip.actions = [dial];
	strip.onWillAppear();
	const before = dial.images.at(-1);
	try {
		assert.equal(state.togglePin("k2", "B"), true);
		assert.deepEqual(
			state.visible().map((v) => v.agent.paneId),
			["A", "B"],
		);
		assert.ok(dial.images.at(-1) !== before, "strip must not retain old key assignment until animation ticks");
	} finally {
		strip.actions = [];
		strip.onWillDisappear();
		state.togglePin("k2");
		roster(["A", "B"]);
		await refreshFixture();
	}
});
afterAll(() => {
	plugin.actions = [];
	plugin.onWillDisappear({ action: keys[0] } as any);
	rmSync(dir, { recursive: true, force: true });
});
test("SDK keyDown does not focus until a short gesture is released", async () => {
	await refreshFixture();
	plugin.onWillAppear();
	await plugin.dispatch("onKeyDown", keys[0]);
	assert.equal(focuses(), "");
	await plugin.dispatch("onKeyUp", keys[0]);
	assert.equal(focuses(), "A\n");
});
test("SDK long release pins the key without trailing focus and strip uses that layout", async () => {
	writeFileSync(process.env.CORRAL_TEST_FOCUS!, "");
	await plugin.dispatch("onKeyDown", keys[0]);
	await new Promise((resolve) => setTimeout(resolve, 510));
	await plugin.dispatch("onKeyUp", keys[0]);
	assert.equal(focuses(), "");
	roster(["urgent", "B", "A"]);
	await refreshFixture();
	assert.equal(state.agentAt(0)?.paneId, "A");
	assert.deepEqual(
		state.visible().map((v) => v.agent.paneId),
		["A", "urgent"],
	);
});
test("SDK disappearance releases the action pin and cancels its pending press", async () => {
	await plugin.dispatch("onKeyDown", keys[0]);
	plugin.actions = [keys[1]!];
	await plugin.dispatch("onWillDisappear", keys[0]);
	await new Promise<void>((resolve) => queueMicrotask(resolve));
	await plugin.dispatch("onKeyUp", keys[0]);
	assert.equal(focuses(), "");
	plugin.actions = keys;
	plugin.onWillAppear();
	assert.equal(state.resolved()[0]?.pinned, false);
	assert.equal(state.agentAt(0)?.paneId, "urgent");
});
test("SDK missing pins render a reserved marker and a second hold releases it", async () => {
	await plugin.dispatch("onKeyDown", keys[0]);
	await new Promise((resolve) => setTimeout(resolve, 510));
	await plugin.dispatch("onKeyUp", keys[0]);
	const { renderKey } = await import("../src/themes");
	assert.equal(keys[0]!.images.at(-1), renderKey(state.theme, state.agentAt(0), state.frame, null, true));
	roster(["B", "A"]);
	await refreshFixture();
	assert.equal(state.agentAt(0), undefined);
	assert.equal(keys[0]!.images.at(-1), renderKey(state.theme, undefined, state.frame, null, true));
	await plugin.dispatch("onKeyDown", keys[0]);
	await new Promise((resolve) => setTimeout(resolve, 510));
	await plugin.dispatch("onKeyUp", keys[0]);
	assert.equal(state.resolved()[0]?.pinned, false);
	assert.equal(state.agentAt(0)?.paneId, "B");
	assert.equal(focuses(), "");
});
test("SDK short release never focuses a pane that vanished while pressed", async () => {
	roster(["A", "B"]);
	await refreshFixture();
	assert.equal(state.agentAt(0)?.paneId, "A", "test setup must finish refreshing the new roster before keyDown");
	writeFileSync(process.env.CORRAL_TEST_FOCUS!, "");
	const alerts = keys[0]!.alerts;
	await plugin.dispatch("onKeyDown", keys[0]);
	roster(["B"]);
	await refreshFixture();
	await plugin.dispatch("onKeyUp", keys[0]);
	assert.equal(focuses(), "");
	assert.equal(keys[0]!.alerts, alerts + 1);
});
test("SDK Raid reset refreshes the strip cache immediately without waiting for animation", async () => {
 roster(["A", "B"]);
 await refreshFixture();
 const { THEMES } = await import("../src/themes");
 const { raidRound } = await import("../src/raid");
 const { AgentsDial } = await import("../src/actions/agents-dial");
 const original = state.theme.id;
 state.cycleTheme(THEMES.findIndex(t => t.id === "raid") - THEMES.findIndex(t => t.id === original));
 assert.equal(await state.startRaidRound(), true);
 const strip = new AgentsDial() as unknown as Omit<InstanceType<typeof AgentsDial>, "actions"> & Dispatch;
 const snapshots: { round: number; image: string }[] = [];
 strip.actions = [{ id: "raid-dial", device: { id: "deck" }, coordinates: { column: 0 }, isDial: () => true,
  async setFeedback(feedback: { canvas: string }) { snapshots.push({ round: raidRound.view.round, image: feedback.canvas }); }, async showAlert() {} }];
 strip.onWillAppear();
 const before = snapshots.at(-1)!;
 try {
  assert.equal(await state.startRaidRound(), true);
  assert.equal(snapshots.at(-1)?.round, before.round + 1, "reset notification must redraw with the new round at the same frame");
  assert.notEqual(snapshots.at(-1)?.image, before.image);
 } finally {
  strip.actions = [];
  strip.onWillDisappear();
  state.cycleTheme(THEMES.findIndex(t => t.id === original) - THEMES.findIndex(t => t.id === "raid"));
 }
});

test("SDK two-device strips focus only agents on that device's resolved keys", async () => {
	roster(["A", "B"]);
	await refreshFixture();
	writeFileSync(process.env.CORRAL_TEST_FOCUS!, "");
	const left = action("left", 0);
	left.device.id = "one";
	const right = action("right", 0);
	right.device.id = "two";
	plugin.actions = [right, left];
	plugin.onWillAppear();
	assert.equal(state.togglePin("right", "B"), true);
	const { AgentsDial } = await import("../src/actions/agents-dial");
	const strip: any = new AgentsDial();
	const dial = (id: string) => ({
		id,
		device: { id },
		coordinates: { column: 0 },
		isDial: () => true,
		async setFeedback() {},
		async showAlert() {},
	});
	const d1 = dial("one"),
		d2 = dial("two");
	strip.actions = [d2, d1];
	strip.onWillAppear();
	try {
		await strip.dispatch("onTouchTap", d1, { tapPos: [50, 0] });
		await strip.dispatch("onTouchTap", d2, { tapPos: [50, 0] });
		assert.equal(focuses(), "A\nB\n");
	} finally {
		strip.actions = [];
		strip.onWillDisappear();
		plugin.actions = keys;
		plugin.onWillAppear();
		writeFileSync(process.env.CORRAL_TEST_FOCUS!, "");
	}
});
