import { test } from "node:test";
import "./art-fixture";
import assert from "node:assert/strict";
import { createScene, type Skin } from "../src/scene";
import type { Agent } from "../src/herdr";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const agent = (paneId = "pet-pane", status: Agent["status"] = "working"): Agent => ({
	paneId, workspace: "PRIVATE", identity: "PRIVATE#pet", title: "TASK", subtitle: "TASK",
	status, focused: false, seq: 7,
});
const skin: Skin = {
	background: () => ({ key: "blank", draw(c) { c.rect(0, 0, 800, 100, [20, 30, 40]); } }),
	drawActor(c, actor) { c.rect(actor.x - 5, 60, 10, actor.feet - 60, [80, 130, 170]); return 60; },
};

test("pet adds temporary hearts to the real scene without changing the agent", () => {
	let now = 50_000;
	const scene = createScene(skin, () => now);
	const canonical = Object.freeze(agent());
	const visible = [{ agent: canonical, column: 0, row: 0 }];
	const baseline = scene.render(visible, 0, 12);
	scene.pet(canonical.paneId);
	assert.notDeepEqual(scene.render(visible, 0, 12).data, baseline.data, "pet must draw hearts immediately even in the same animation frame");
	now += 999;
	assert.notDeepEqual(scene.render(visible, 0, 12).data, baseline.data, "hearts remain for nearly a second");
	now += 1;
	assert.deepEqual(scene.render(visible, 0, 12).data, baseline.data, "hearts expire at one second without advancing the animation frame");
	now += 10_000;
	assert.deepEqual(scene.render(visible, 0, 12).data, baseline.data, "later redraws must not replay an expired pet");
	assert.deepEqual(canonical, agent());
});

test("removing a pane cancels its pet even when the same pane immediately returns", () => {
	const scene = createScene(skin, () => 0);
	const visible = [{ agent: agent(), column: 0, row: 0 }];
	scene.render(visible, 0, 12);
	scene.pet("pet-pane");
	scene.render([], 0, 12);
	const fresh = createScene(skin, () => 0);
	fresh.render([], 0, 12);
	assert.ok(scene.render(visible, 0, 12).data.equals(fresh.render(visible, 0, 12).data), "a removed pane must not inherit its old hearts on reappearance");
});

test("pet effects and hit targets are independent in every scene fork", () => {
	let now = 0;
	const first = createScene(skin, () => now), second = first.fork();
	const visible = [{ agent: agent(), column: 0, row: 0 }];
	const baseline = first.render(visible, 0, 12);
	second.render(visible, 0, 12);
	first.pet("pet-pane");
	assert.ok(!first.render(visible, 0, 12).data.equals(baseline.data));
	assert.ok(second.render(visible, 0, 12).data.equals(baseline.data), "another device must not inherit hearts");
	second.pet("absent-pane");
	assert.ok(second.render(visible, 0, 12).data.equals(baseline.data));
	now = 1000;
	assert.ok(first.render(visible, 0, 12).data.equals(baseline.data));
});

test("both real skins retain blocked/done tags and camera badges beside hearts", async () => {
	const { farm } = await import("../src/themes/farm");
	const { kingdom } = await import("../src/themes/kingdom");
	for (const theme of [farm, kingdom]) {
		const visible = [{ agent: Object.freeze(agent("blocked", "blocked")), column: 0, row: 0 },
			{ agent: Object.freeze(agent("done", "done")), column: 0, row: 1 }];
		const scene = theme.scene.fork();
		for (let frame = 0; frame < 30; frame++) scene.render(visible, frame, 12, true);
		const baseline = scene.render(visible, 29, 12, true);
		scene.pet("blocked"); scene.pet("done");
		const petted = scene.render(visible, 29, 12, true);
		assert.ok(!petted.data.equals(baseline.data), `${theme.id} must draw hearts`);
		assert.ok(petted.crop(0, 0, 800, 35).data.equals(baseline.crop(0, 0, 800, 35).data), "! and ✓ labels remain untouched");
		assert.ok(petted.crop(0, 89, 800, 11).data.equals(baseline.crop(0, 89, 800, 11).data), "camera badges remain untouched");
		assert.ok(petted.crop(200, 0, 600, 100).data.equals(baseline.crop(200, 0, 600, 100).data), "hearts stay in the target segment");
		// Petting leaves the lower actor/body pixels drawn by the original skin intact.
		assert.ok(petted.crop(0, 65, 200, 24).data.equals(baseline.crop(0, 65, 200, 24).data));
	}
});

// Run SDK fixtures in a child process: other test files mock the same module and
// capture HERDR_BIN_PATH on import. The handler, state and renderer stay real.
async function handlerFixture() {
	const { mock } = await import("bun:test");
	const assert: typeof import("node:assert/strict") = (await import("node:assert/strict")).default;
	const { readFileSync, writeFileSync } = await import("node:fs");
	const root = process.env.CORRAL_PET_ROOT!;
	const scenario = process.env.CORRAL_PET_SCENARIO;
	if (scenario === "legacy-cloud-env") {
		// Old launch configuration must not reserve a dead strip region or make requests.
		process.env.CURSOR_CLOUD_AGENT_ID = "bc-synthetic";
		process.env.CURSOR_API_KEY = "synthetic-not-a-credential";
		globalThis.fetch = Object.assign(async () => { throw new Error("No network in a local strip fixture"); }, { preconnect: globalThis.fetch.preconnect });
	}
	mock.module(process.env.CORRAL_PET_SDK!, () => ({
		SingletonAction: class {},
		default: { logger: { warn() {}, error() {} }, settings: { getGlobalSettings: async () => ({}), setGlobalSettings: async () => {} } },
	}));
	const { state }: typeof import("../src/state") = await import(`${root}/src/state.ts`);
	const { AgentsDial }: typeof import("../src/actions/agents-dial") = await import(`${root}/src/actions/agents-dial.ts`);
	const { PNG }: typeof import("pngjs") = await import(process.env.CORRAL_PET_PNG!);
	let time = 50_000, frame = 100;
	Object.defineProperty(performance, "now", { configurable: true, value: () => time });
	let notify = () => {};
	await state.refresh();
	state.setSlots([{ id: "key", deviceId: "deck", column: 0, row: 0 }]);
	Object.defineProperties(state, {
		frame: { configurable: true, get: () => frame },
		themeBanner: { configurable: true, get: () => null },
		subscribe: { configurable: true, value: (fn: () => void) => { notify = fn; return () => {}; } },
		// Permit herdr focus but never activate the test machine's terminal.
		focusPermission: { configurable: true, value: () => { let checks = 0; return () => ++checks === 1; } },
	});
	const images: string[] = [];
	let alerts = 0;
	const dial = {
		id: "dial", device: { id: "deck" }, coordinates: { column: 0, row: 0 }, isDial: () => true,
		setFeedback: async (f: { canvas: string }) => { images.push(f.canvas); },
		showAlert: async () => { alerts++; },
	};
	const strip = new AgentsDial();
	Object.defineProperty(strip, "actions", { configurable: true, value: [dial] });
	const otherImages: string[] = [];
	if (scenario === "devices") {
		writeFileSync(process.env.CORRAL_TEST_ROSTER!, JSON.stringify([
			{ pane_id: "pet-pane", workspace_id: "PRIVATE", cwd: "PRIVATE", agent_status: "blocked" },
			{ pane_id: "other-pane", workspace_id: "OTHER", cwd: "OTHER", agent_status: "done" },
		]));
		await state.refresh();
		state.setSlots([{ id: "key", deviceId: "deck", column: 0, row: 0 }, { id: "other-key", deviceId: "other-deck", column: 0, row: 0 }]);
		const other = { ...dial, id: "other-dial", device: { id: "other-deck" }, setFeedback: async (f: { canvas: string }) => { otherImages.push(f.canvas); } };
		Object.defineProperty(strip, "actions", { value: [other, dial] });
	}
	if (scenario === "showcase") state.toggleShowcase();
	strip.onWillAppear();
	const touch = (hold: boolean) => strip.onTouchTap({ action: dial, payload: { controller: "Encoder", coordinates: dial.coordinates, settings: {}, resources: {}, hold, tapPos: [50, 50] } } as unknown as import("@elgato/streamdeck").TouchTapEvent);
	const hearts = () => {
		const png = PNG.sync.read(Buffer.from(images.at(-1)!.split(",")[1]!, "base64"));
		let count = 0;
		for (let i = 0; i < png.data.length; i += 4) if (png.data[i] === 255 && png.data[i + 1] === 113 && png.data[i + 2] === 156) count++;
		return count;
	};
	const baseline = images.at(-1);
	const otherBaseline = otherImages.at(-1);
	const canonical = JSON.stringify(state.agents);
	const layout = JSON.stringify(state.resolved());
	if (scenario === "stale") Object.defineProperty(state, "agents", { get: () => [] });
	if (scenario === "empty") state.setSlots([{ id: "key", deviceId: "deck", column: 1, row: 0 }]);
	if (scenario === "offline") Object.defineProperty(state, "error", { get: () => "herdr off" });
	if (scenario === "short") {
		await touch(false);
		assert.equal(readFileSync(process.env.CORRAL_TEST_FOCUS!, "utf8"), "pet-pane\n");
		assert.equal(hearts(), 0);
		return;
	}
	await touch(true);
	assert.equal(readFileSync(process.env.CORRAL_TEST_FOCUS!, "utf8"), "", "a long touch must never focus");
	if (["stale", "offline", "empty"].includes(scenario!)) {
		assert.ok(images.at(-1) === baseline, "stale, offline and empty hold targets must be ignored");
		assert.equal(alerts, 0, "an empty hold must not fall through to focus or its alert path");
		return;
	}
	assert.ok(images.at(-1) !== baseline, "the real handler must immediately send hearts through native feedback");
	assert.ok(hearts() > 0, "native feedback contains the original pixel hearts");
	assert.equal(JSON.stringify(state.agents), canonical);
	assert.equal(JSON.stringify(state.resolved()), layout);
	assert.equal(alerts, 0);
	if (scenario === "devices") {
		assert.equal(state.visible("deck")[0]?.agent.paneId, "pet-pane");
		assert.equal(state.visible("other-deck")[0]?.agent.paneId, "other-pane");
		assert.ok(otherImages.at(-1) === otherBaseline, "petting one device must not alter the overlapping strip on another device");
	}
	if (scenario === "showcase") {
		assert.equal(state.canFocus, false);
		assert.equal(state.visible("deck")[0]?.agent.workspace, "AGENT A");
		await touch(false);
		assert.equal(readFileSync(process.env.CORRAL_TEST_FOCUS!, "utf8"), "");
	}
	if (scenario === "expiry") {
		time += 999; frame += 2; notify(); assert.ok(hearts() > 0);
		time += 1; frame += 2; notify(); assert.equal(hearts(), 0);
		time += 5000; frame += 2; notify(); assert.equal(hearts(), 0);
	}
	if (scenario === "removed") {
		writeFileSync(process.env.CORRAL_TEST_ROSTER!, "[]"); await state.refresh(); notify();
		assert.equal(hearts(), 0);
		writeFileSync(process.env.CORRAL_TEST_ROSTER!, JSON.stringify([{ pane_id: "pet-pane", workspace_id: "PRIVATE", cwd: "PRIVATE", agent_status: "blocked" }]));
		await state.refresh(); notify(); assert.equal(hearts(), 0);
	}
	if (scenario === "theme") {
		const original = state.theme;
		Object.defineProperty(state, "theme", { configurable: true, get: () => ({ ...original, id: "other-skin" }) });
		notify(); assert.equal(hearts(), 0);
		Object.defineProperty(state, "theme", { get: () => original }); notify(); assert.equal(hearts(), 0);
	}
}

function runHandler(scenario = "hold") {
	const dir = mkdtempSync(join(process.env.TMPDIR ?? "/root/.hermes/cache/scratch", "corral-pet-test-"));
	try {
		copyFileSync(new URL("./fixtures/herdr.cjs", import.meta.url), join(dir, "herdr"));
		chmodSync(join(dir, "herdr"), 0o755);
		writeFileSync(join(dir, "focus"), "");
		writeFileSync(join(dir, "roster.json"), JSON.stringify([{ pane_id: "pet-pane", workspace_id: "PRIVATE", cwd: "PRIVATE", name: "TASK", agent_status: "blocked", state_change_seq: 7 }]));
		writeFileSync(join(dir, "handler.ts"), `await (${handlerFixture.toString()})();`);
		const result = spawnSync(process.execPath, [join(dir, "handler.ts")], {
			cwd: dir, encoding: "utf8", timeout: 15_000,
			env: { ...process.env, CORRAL_PET_ROOT: join(import.meta.dir, ".."), CORRAL_PET_SDK: import.meta.resolve("@elgato/streamdeck"), CORRAL_PET_PNG: import.meta.resolve("pngjs"), CORRAL_PET_SCENARIO: scenario,
				CORRAL_IMGS: join(import.meta.dir, "../dev.fedeya.corral.sdPlugin/imgs"), HERDR_BIN_PATH: join(dir, "herdr"),
				CORRAL_TEST_FOCUS: join(dir, "focus"), CORRAL_TEST_ROSTER: join(dir, "roster.json") },
		});
		assert.equal(result.status, 0, result.stdout + result.stderr);
	} finally { rmSync(dir, { recursive: true, force: true }); }
}

test("real touch handler pets instead of focusing or changing canonical state", () => runHandler());
test("left strip remains pettable with legacy cloud launch configuration", () => runHandler("legacy-cloud-env"));
test("real hold handler ignores a stale pane absent from the live roster", () => runHandler("stale"));
test("real long touch works in Showcase while short touch still cannot focus", () => runHandler("showcase"));
test("short touch retains the original herdr focus path", () => runHandler("short"));
test("long touch ignores an empty segment after a same-frame layout change", () => runHandler("empty"));
test("offline long touch is ignored without focusing", () => runHandler("offline"));
test("normal strip animation expires hearts without replaying them", () => runHandler("expiry"));
test("live roster removal cancels hearts across immediate pane reappearance", () => runHandler("removed"));
test("theme changes discard device-local hearts even when switching back", () => runHandler("theme"));
test("native two-device feedback keeps affection local to the touched device", () => runHandler("devices"));
