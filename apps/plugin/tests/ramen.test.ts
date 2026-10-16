import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import type { Agent } from "../src/herdr";
import type { Canvas, RGB } from "../src/pixel";
import { PNG } from "pngjs";

// Use the shipped art only: Ramen must not depend on optional Kingdom sheets.
process.env.CORRAL_IMGS = resolve(import.meta.dir, "../dev.fedeya.corral.sdPlugin/imgs");
const { THEMES } = await import("../src/themes");

test("Ramen / Cocina is a built-in theme without optional art", () => {
	const ramen = THEMES.find((theme) => theme.id === "ramen");
	assert.ok(ramen, "Ramen must be available in the native theme cycle without downloaded art");
	assert.equal(ramen.name, "RAMEN / COCINA");
});

const { ramen } = await import("../src/themes/ramen");
const chef: Agent = {
	paneId: "synthetic-chef", identity: "synthetic-kitchen", workspace: "SYNTHETIC", title: "Fixture only",
	status: "working", focused: false, seq: 1,
};
const colours = { cream: [255, 241, 212], steel: [169, 196, 188], steam: [219, 232, 214] } satisfies Record<string, RGB>;
function count(c: Canvas, rgb: RGB): number {
	let n = 0;
	for (let i = 0; i < c.data.length; i += 4)
		if (rgb.every((value, channel) => c.data[i + channel] === value)) n++;
	return n;
}

test("working chef wears a toque and carries an animated steaming stockpot, not a generic status dot", () => {
	const c = ramen.drawKey(chef, 0);
	assert.deepEqual([c.width, c.height], [120, 120]);
	assert.ok(count(c.crop(22, 25, 32, 16), colours.cream) >= 40, "chef's white toque must be readable");
	assert.ok(count(c.crop(64, 48, 34, 24), colours.steel) >= 40, "a wide handled stockpot must be visible");
	assert.ok(count(c.crop(64, 30, 34, 18), colours.steam) >= 12, "steam must rise above the working pot");
	assert.ok(!c.crop(64, 30, 34, 18).data.equals(ramen.drawKey(chef, 1).crop(64, 30, 34, 18).data), "steam animates while herdr says working");
	const looks = new Set(Array.from({ length: 16 }, (_, i) => ramen.drawKey({ ...chef, identity: `chef-${i}` }, 0).crop(22, 48, 32, 22).data.toString("hex")));
	assert.ok(looks.size >= 4, "identity must choose several stable apron palettes");
	assert.ok(c.data.equals(ramen.drawKey({ ...chef, seq: 999, title: "changed task" }, 0).data), "art must not invent progress from titles or poll sequence");
});

const { Canvas: PixelCanvas } = await import("../src/pixel");
const { BANG, CHECK, drawBubble, P } = await import("../src/render");
function assertBubble(c: Canvas, icon: string[], colour: RGB): void {
	const expected = new PixelCanvas(120, 120);
	drawBubble(expected, 90, 4, icon, colour);
	for (let y = 4; y < 30; y++) for (let x = 90; x < 114; x++) {
		const i = (y * 120 + x) * 4;
		if (expected.data[i + 3]) assert.deepEqual(c.data.subarray(i, i + 4), expected.data.subarray(i, i + 4), "status bubble must remain legible above the kitchen props");
	}
}

test("blocked chef consults an open recipe book and asks for input with !", () => {
	const c = ramen.drawKey({ ...chef, status: "blocked" }, 0);
	assert.ok(count(c.crop(64, 44, 34, 28), [242, 210, 143]) >= 60, "blocked must show two parchment recipe pages");
	assert.ok(count(c.crop(64, 44, 34, 28), [176, 76, 65]) >= 12, "recipe book needs a distinct binding");
	assert.equal(count(c.crop(64, 30, 34, 18), colours.steam), 0, "blocked is not still cooking");
	assertBubble(c, BANG, P.red);
});

test("done chef serves a finished ramen bowl with noodles, garnish and a check", () => {
	const c = ramen.drawKey({ ...chef, status: "done" }, 0);
	assert.ok(count(c.crop(64, 44, 34, 28), [231, 166, 62]) >= 24, "finished ramen needs visible golden noodles");
	assert.ok(count(c.crop(64, 44, 34, 28), [76, 132, 76]) >= 8, "ramen must have a green garnish");
	assert.ok(count(c.crop(64, 44, 34, 28), colours.cream) >= 40, "done must have a ceramic serving bowl, not a cooking pot");
	assertBubble(c, CHECK, P.forest);
	assert.ok(c.data.equals(ramen.drawKey({ ...chef, status: "done" }, 10000).data), "completion stays done; elapsed frames never restart work");
});

test("idle chef has stored utensils in a crock and no active cooking steam", () => {
	const c = ramen.drawKey({ ...chef, status: "idle" }, 0);
	assert.ok(count(c.crop(66, 36, 30, 36), colours.steel) >= 20, "idle must show a stored ladle and chopsticks");
	assert.ok(count(c.crop(66, 52, 30, 20), [176, 76, 65]) >= 32, "utensils belong in their terracotta crock");
	assert.equal(count(c.crop(64, 30, 34, 18), colours.steam), 0);
	assert.ok(c.data.equals(ramen.drawKey({ ...chef, status: "idle" }, 10000).data), "idle never becomes cooking on a timer");
});

test("unknown is an explicit question, not an idle or completed order", () => {
	const c = ramen.drawKey({ ...chef, status: "unknown" }, 0);
	assertBubble(c, [".###.", "#...#", "...#.", "..#..", "..#..", ".....", "..#.."], P.silver);
	assert.ok(!c.crop(3, 3, 114, 73).data.equals(ramen.drawKey({ ...chef, status: "idle" }, 0).crop(3, 3, 114, 73).data));
	assert.equal(count(c.crop(64, 30, 34, 18), colours.steam), 0);
});

test("real 800x100 strip uses the same kitchen chef and task props as the keys", () => {
	const required: [Agent["status"], RGB, number][] = [
		["working", colours.steam, 12], ["blocked", [242, 210, 143], 60],
		["done", [231, 166, 62], 24], ["idle", [176, 76, 65], 32], ["unknown", [176, 76, 65], 32],
	];
	for (const [status, colour, minimum] of required) {
		const scene = ramen.scene.fork();
		const visible = [{ agent: { ...chef, status }, column: 1, row: 0 }];
		let c = scene.render(visible, 0, 12);
		for (let frame = 1; frame <= 24; frame++) c = scene.render(visible, frame, 12);
		assert.deepEqual([c.width, c.height], [800, 100]);
		assert.ok(count(c.crop(200, 36, 200, 53), colours.cream) >= 40, `${status} must keep its chef's toque in the narrow strip`);
		assert.ok(count(c.crop(200, 36, 200, 53), colour) >= minimum, `${status} must show its actual kitchen prop, not a reskinned slime`);
	}
});

test("kitchen strip changes between day, dusk and night without stale cached backdrops", { timeout: 30_000 }, () => {
	const scene = ramen.scene.fork();
	const day = scene.render([], 0, 12);
	const dusk = scene.render([], 0, 18);
	const night = scene.render([], 0, 23);
	assert.ok(!day.data.equals(dusk.data), "dusk needs a warm kitchen light, not the day cache");
	assert.ok(!day.data.equals(night.data), "night needs a distinct lit kitchen");
	assert.ok(!dusk.data.equals(night.data));
	for (let hour = 0; hour < 24; hour++) for (const frame of [0, 1, 3, 4, 7, 8, 63, 128]) {
		assert.ok(scene.render([], frame, hour).data.equals(ramen.scene.fork().render([], frame, hour).data), `cached backdrop differs at hour ${hour}, frame ${frame}`);
	}
	assert.ok(day.data.equals(scene.render([], 128, 12).data), "returning to daytime restores the exact background");
});

test("unknown strip question stays complete below both shared caption rows", () => {
	const expected = new PixelCanvas(20, 20);
	expected.pattern([".###.", "#...#", "...#.", "..#..", "..#..", ".....", "..#.."], 0, 0, 2, { "#": P.silver });
	for (const row of [0, 1]) {
		const scene = ramen.scene.fork();
		const visible = [{ agent: { ...chef, status: "unknown" as const }, column: 1, row }];
		for (let frame = 0; frame < 20; frame++) scene.render(visible, frame, 12);
		const c = scene.render(visible, 20, 12);
		assert.equal(count(c.crop(200, 34, 200, 55), P.silver), count(expected, P.silver), `row ${row}: shared captions must not erase any part of the question`);
	}
});

const statuses: Agent["status"][] = ["working", "blocked", "done", "idle", "unknown"];
const { renderKey } = await import("../src/themes");
const { Showcase } = await import("../src/showcase");
const { label, showcaseMarker, THEME } = await import("../src/render");
const decode = (url: string) => PNG.sync.read(Buffer.from(url.split(",")[1]!, "base64"));

test("keyFrame is a lossless periodic cache contract for every status and long-running frame", { timeout: 30_000 }, () => {
	for (const status of statuses) {
		const agent = { ...chef, status };
		const byStep = new Map<number, Buffer>();
		for (const frame of [...Array.from({ length: 65 }, (_, i) => i), 127, 512, 10000]) {
			const step = ramen.keyFrame(agent, frame);
			const direct = ramen.drawKey(agent, frame);
			assert.deepEqual([direct.width, direct.height], [120, 120]);
			const previous = byStep.get(step);
			if (previous) assert.ok(previous.equals(direct.data), `${status}: cache collision at ${frame}, step ${step}`);
			else byStep.set(step, direct.data);
			assert.ok(decode(renderKey(ramen, agent, frame, null)).data.equals(direct.data), `${status}: cached PNG differs at frame ${frame}`);
			assert.ok(direct.data.equals(ramen.drawKey(agent, frame + 4).data), `${status}: four-frame loop must repeat exactly`);
			for (let i = 3; i < direct.data.length; i += 4) assert.equal(direct.data[i], 255, "native keys must be opaque");
		}
		assert.equal(byStep.size, status === "working" ? 4 : 1, `${status} cache must not grow forever`);
	}
});

test("workspace and subtitle captions are real label pixels, including camera aliases sharing identity", () => {
	const mode = new Showcase();
	mode.toggle();
	for (const status of statuses) for (const workspace of ["A", "LONG PRIVATE WORKSPACE NAME"]) {
		const original = { ...chef, status, workspace, subtitle: "PRIVATE TASK", focused: true };
		const safe = mode.project(original)!;
		const normal = ramen.drawKey(original, 1);
		const shown = ramen.drawKey(safe, 1);
		assert.ok(normal.crop(0, 0, 120, 78).data.equals(shown.crop(0, 0, 120, 78).data), "identity, not external caption, seeds art");
		const expected = new PixelCanvas(120, 120);
		expected.rect(0, 0, 120, 120, THEME[status].bg);
		label(expected, safe.workspace, THEME[status].text, safe.subtitle);
		assert.ok(shown.crop(3, 78, 114, 28).data.equals(expected.crop(3, 78, 114, 28).data), "render projected captions, never canonical identity");
		const unsafelyCaptioned = { ...original, subtitle: safe.subtitle };
		assert.notEqual(renderKey(ramen, unsafelyCaptioned, 1, null), renderKey(ramen, safe, 1, null), "equal identities and subtitles must not collide across workspace aliases");
		assert.ok(decode(renderKey(ramen, safe, 1, null)).data.equals(shown.data));
	}
});

test("PIN and Showcase overlays leave chef silhouettes and key caption rows intact", () => {
	for (const status of statuses) {
		const agent = { ...chef, status, subtitle: "TASK" };
		const direct = ramen.drawKey(agent, 0);
		assert.equal(count(direct.crop(4, 4, 46, 20), colours.cream), 0, "chef's toque stays clear of PIN");
		const marked = decode(renderKey(ramen, agent, 0, null, true, true));
		const canvas = new PixelCanvas(120, 120);
		marked.data.copy(canvas.data);
		assert.ok(direct.crop(22, 30, 76, 44).data.equals(canvas.crop(22, 30, 76, 44).data), "badges must not cover the chef or task prop");
		assert.ok(direct.crop(3, 78, 114, 28).data.equals(canvas.crop(3, 78, 114, 28).data), "Showcase footer leaves workspace/subtitle above it");
		assert.deepEqual([...marked.data.subarray((7 * 120 + 8) * 4, (7 * 120 + 8) * 4 + 3)], [...P.yellow]);
		const expected = ramen.drawKey(agent, 0);
		showcaseMarker(expected);
		assert.ok(canvas.crop(3, 106, 114, 13).data.equals(expected.crop(3, 106, 114, 13).data));
	}
});

test("shared scene preserves working movement, same-frame roster changes and independent device hit targets", () => {
	const a = ramen.scene.fork();
	const b = ramen.scene.fork();
	const first = [{ agent: chef, column: 0, row: 0 }];
	const other = { ...chef, paneId: "synthetic-other", identity: "other-chef", status: "blocked" as const };
	const start = a.render(first, 0, 12);
	let walked = start;
	for (let frame = 1; frame <= 30; frame++) walked = a.render(first, frame, 12);
	assert.ok(!start.crop(0, 36, 200, 53).data.equals(walked.crop(0, 36, 200, 53).data), "working chefs actually carry their pot across the strip");
	assert.equal(a.agentAt(75)?.paneId, chef.paneId);
	b.render([{ agent: other, column: 0, row: 0 }], 30, 12);
	assert.equal(b.agentAt(75)?.paneId, other.paneId);
	assert.equal(a.agentAt(75)?.paneId, chef.paneId, "another device cannot replace the first device's touch targets");
	a.render([{ agent: other, column: 2, row: 1 }], 30, 12);
	assert.equal(a.agentAt(75), undefined, "disappearing chefs lose their touch target within the same frame");
	assert.equal(a.agentAt(575)?.paneId, other.paneId);
	assert.equal(b.agentAt(75)?.paneId, other.paneId);
});

test("strip Showcase uses projected labels and a footer on every segment without hiding the cooks", () => {
	const mode = new Showcase();
	mode.toggle();
	for (const status of statuses) {
		const scene = ramen.scene.fork();
		const agent = { ...chef, status, workspace: "SECRET", subtitle: "PRIVATE" };
		const visible = [{ agent, column: 1, row: 0 }];
		for (let frame = 0; frame < 20; frame++) scene.render(visible, frame, 12);
		const normal = scene.render(visible, 20, 12);
		const safe = mode.project(agent)!;
		const shown = scene.render([{ ...visible[0]!, agent: safe }], 20, 12, true);
		assert.ok(normal.crop(200, 36, 200, 53).data.equals(shown.crop(200, 36, 200, 53).data), "camera footer begins below all cook art");
		assert.ok(!normal.crop(200, 0, 200, 36).data.equals(shown.crop(200, 0, 200, 36).data), "strip tags must actually switch to aliases");
		assert.equal(scene.agentAt(275)?.paneId, chef.paneId, "safe projection preserves canonical focus target");
		for (let column = 0; column < 4; column++) {
			const expected = scene.render([{ ...visible[0]!, agent: safe }], 20, 12);
			showcaseMarker(expected, column * 200, 89, 200);
			assert.ok(shown.crop(column * 200 + 3, 89, 194, 11).data.equals(expected.crop(column * 200 + 3, 89, 194, 11).data));
		}
	}
});
