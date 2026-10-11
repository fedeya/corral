import { test, expect, mock } from "bun:test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const dir = `${process.env.TMPDIR}/corral-showcase-tests-${process.pid}`;
mkdirSync(dir, { recursive: true });
process.env.HERDR_BIN_PATH = `${dir}/herdr`;
process.env.CORRAL_IMGS = `${process.cwd()}/dev.fedeya.corral.sdPlugin/imgs`;
writeFileSync(`${dir}/calls`, "");
writeFileSync(
	`${dir}/agents.json`,
	JSON.stringify([{ pane_id: "p", workspace_id: "w", name: "SECRET TASK", agent_status: "blocked" }]),
);
writeFileSync(
	`${dir}/herdr`,
	`#!/usr/bin/env node\nconst fs=require('fs');const args=process.argv.slice(2);fs.appendFileSync('${dir}/calls',args.join(' ')+'\\n');console.log(JSON.stringify({result:args[0]==='workspace'?{workspaces:[{workspace_id:'w',label:'PRIVATE CLIENT'}]}:{agents:JSON.parse(fs.readFileSync('${dir}/agents.json','utf8'))}}));`,
	{ mode: 0o755 },
);
mock.module("@elgato/streamdeck", () => ({
	default: {
		settings: { getGlobalSettings: async () => ({}), setGlobalSettings: async () => {} },
		logger: { warn() {}, error() {} },
	},
	SingletonAction: class {
		actions: any[] = [];
	},
}));
const { state } = await import("../src/state");
const { AgentSlot } = await import("../src/actions/agent-slot");
const { AgentsDial } = await import("../src/actions/agents-dial");
const key = {
	id: "key",
	device: { id: "d" },
	coordinates: { column: 0, row: 0 },
	isKey: () => true,
	isInMultiAction: () => false,
	setImage: async (_: string) => {},
	showAlert: async () => {},
};
test("native showcase toggle changes mode without focusing and displays camera state", async () => {
	const { ShowcaseToggle } = await import("../src/actions/showcase-toggle");
	const toggle = new ShowcaseToggle();
	let image = "";
	Object.defineProperty(toggle, "actions", {
		configurable: true,
		value: [
			{
				...key,
				setImage: async (s: string) => {
					image = s;
				},
			},
		],
	});
	toggle.onWillAppear();
	const off = image;
	await toggle.onKeyDown();
	expect(state.showcase).toBe(true);
	expect(image !== off).toBe(true);
	await toggle.onKeyDown();
	expect(state.showcase).toBe(false);
	expect(image === off).toBe(true);
	expect(readFileSync(`${dir}/calls`, "utf8")).not.toContain("agent focus");
	Object.defineProperty(toggle, "actions", { value: [] });
	toggle.onWillDisappear();
});
const dial = { ...key, isDial: () => true, setFeedback: async (_: unknown) => {} };
test("actual key, touch and dial handlers never focus during showcase or resume tail", async () => {
	await state.refresh();
	while (state.agents.length === 0) await new Promise((resolve) => setTimeout(resolve, 10));
	state.setSlots([{ id: key.id, deviceId: key.device.id, column: 0, row: 0 }]);
	state.theme.scene.render(state.visible(), state.frame, 12);
	const slots = new AgentSlot();
	Object.defineProperty(slots, "actions", { value: [key] });
	const strip = new AgentsDial();
	Object.defineProperty(strip, "actions", { value: [dial] });
	state.toggleShowcase();
	await slots.onKeyDown({ action: key } as any);
	await slots.onKeyUp({ action: key } as any);
	await strip.onDialDown({ action: dial } as any);
	await strip.onTouchTap({ action: dial, payload: { tapPos: [20, 20] } } as any);
	state.toggleShowcase();
	await slots.onKeyDown({ action: key } as any);
	await slots.onKeyUp({ action: key } as any);
	await strip.onDialDown({ action: dial } as any);
	await strip.onTouchTap({ action: dial, payload: { tapPos: [20, 20] } } as any);
	expect(readFileSync(`${dir}/calls`, "utf8")).not.toContain("agent focus");
});
test("actual actions render projected keys and strip immediately on toggle", async () => {
	await state.refresh();
	while (state.agents.length === 0) await new Promise((resolve) => setTimeout(resolve, 10));
	const { renderKey } = await import("../src/themes");
	const { Showcase } = await import("../src/showcase");
	const mode = new Showcase();
	mode.toggle();
	let image = "";
	let feedback = "";
	const slots = new AgentSlot();
	Object.defineProperty(slots, "actions", {
		configurable: true,
		value: [
			{
				...key,
				setImage: async (s: string) => {
					image = s;
				},
			},
		],
	});
	const strip = new AgentsDial();
	Object.defineProperty(strip, "actions", {
		configurable: true,
		value: [
			{
				...dial,
				setFeedback: async (f: any) => {
					feedback = f.canvas;
				},
			},
		],
	});
	slots.onWillAppear();
	strip.onWillAppear();
	const original = image;
	const originalStrip = feedback;
	state.toggleShowcase();
	expect(state.displayAgentAt(0)?.workspace).toBe("AGENT A");
	expect(state.visible()[0]?.agent.title).toBe("AGENT A");
	expect(state.agents[0]?.workspace).toBe("PRIVATE CLIENT");
	expect(image === renderKey(state.theme, mode.project(state.agents[0]), state.frame, state.error, false, true)).toBe(true);
	expect(image !== original).toBe(true);
	expect(feedback !== originalStrip).toBe(true);
	state.toggleShowcase();
	expect(image === original).toBe(true);
	expect(feedback === originalStrip).toBe(true);
	Object.defineProperty(slots, "actions", { value: [] });
	Object.defineProperty(strip, "actions", { value: [] });
	slots.onWillDisappear({ action: key } as any);
	strip.onWillDisappear();
});
test("camera holds preserve pin layout, safe aliases and both key badges through disappearance", async () => {
	await state.refresh();
	const { renderKey } = await import("../src/themes");
	const roster = readFileSync(`${dir}/agents.json`, "utf8");
	let image = "";
	const action = { ...key, setImage: async (url: string) => { image = url; } };
	const slots = new AgentSlot();
	Object.defineProperty(slots, "actions", { configurable: true, value: [action] });
	slots.onWillAppear();
	state.toggleShowcase();
	const focusCalls = () => readFileSync(`${dir}/calls`, "utf8").split("\n").filter((call) => call.startsWith("agent focus "));
	const before = focusCalls();
	try {
		slots.onKeyDown({ action } as any);
		await new Promise((resolve) => setTimeout(resolve, 510));
		await slots.onKeyUp({ action } as any);
		expect(state.resolved()[0]?.pinned).toBe(true);
		expect(state.displayAgentAt(0)?.workspace).toBe("AGENT A");
		expect(image).toBe(renderKey(state.theme, state.displayAgentAt(0), state.frame, null, true, true));
		expect(focusCalls()).toEqual(before);
		writeFileSync(`${dir}/agents.json`, "[]");
		await state.refresh(); await state.refresh();
		expect(state.visible("d")).toEqual([]);
		expect(image).toBe(renderKey(state.theme, undefined, state.frame, null, true, true));
		writeFileSync(`${dir}/agents.json`, roster);
		await state.refresh(); await state.refresh();
		expect(state.displayAgentAt(0)?.workspace).toBe("AGENT A");
		expect(state.resolved()[0]?.pinned).toBe(true);
		slots.onKeyDown({ action } as any);
		await new Promise((resolve) => setTimeout(resolve, 510));
		await slots.onKeyUp({ action } as any);
		expect(state.resolved()[0]?.pinned).toBe(false);
		expect(readFileSync(`${dir}/calls`, "utf8")).not.toContain("agent focus");
	} finally {
		if (state.showcase) state.toggleShowcase();
		writeFileSync(`${dir}/agents.json`, roster);
		Object.defineProperty(slots, "actions", { value: [] });
		slots.onWillDisappear({ action } as any);
		await new Promise<void>((resolve) => queueMicrotask(resolve));
	}
});
test("focus cannot bring a terminal forward if showcase starts during herdr focus", async () => {
	const { focusAgent } = await import("../src/herdr");
	let checks = 0;
	await expect(focusAgent("p", () => ++checks === 1)).resolves.toBeUndefined();
	expect(checks).toBe(2);
});
test("an in-flight focus permission stays revoked after showcase resumes", async () => {
	await new Promise((resolve) => setTimeout(resolve, 1050));
	const allowed = state.focusPermission();
	expect(allowed()).toBe(true);
	state.toggleShowcase();
	state.toggleShowcase();
	await new Promise((resolve) => setTimeout(resolve, 1050));
	expect(state.canFocus).toBe(true);
	expect(allowed()).toBe(false);
});
test("a key press cannot regain focus permission across a camera epoch", async () => {
	await state.refresh();
	state.setSlots([{ id: key.id, deviceId: key.device.id, column: 0, row: 0 }]);
	const slots = new AgentSlot();
	Object.defineProperty(slots, "actions", { value: [key] });
	const now = Date.now;
	const baseline = readFileSync(`${dir}/calls`, "utf8");
	try {
		for (const start of ["normal", "camera", "quarantine"]) {
			Date.now = () => now() + 5000;
			if (start === "camera") state.toggleShowcase();
			if (start === "quarantine") { state.toggleShowcase(); state.toggleShowcase(); }
			slots.onKeyDown({ action: key } as any);
			if (start === "normal") state.toggleShowcase();
			if (state.showcase) state.toggleShowcase();
			// Expire only the wall-clock quarantine, not the 500 ms physical gesture.
			Date.now = () => now() + 10000;
			await slots.onKeyUp({ action: key } as any);
			expect(readFileSync(`${dir}/calls`, "utf8")).toBe(baseline);
		}
	} finally {
		Date.now = now;
		if (state.showcase) state.toggleShowcase();
		state.toggleShowcase(); state.toggleShowcase();
	}
});
test("normal key, dial and touch focus paths resume after the quarantine", async () => {
	await new Promise((resolve) => setTimeout(resolve, 1050));
	const count = () =>
		readFileSync(`${dir}/calls`, "utf8")
			.split("\n")
			.filter((s) => s === "agent focus p").length;
	const before = count();
	const slots = new AgentSlot();
	Object.defineProperty(slots, "actions", { value: [key] });
	const strip = new AgentsDial();
	Object.defineProperty(strip, "actions", { value: [dial] });
	state.setSlots([{ id: key.id, deviceId: key.device.id, column: 0, row: 0 }]);
	state.theme.scene.render(state.visible(), state.frame, 12);
	await slots.onKeyDown({ action: key } as any);
	await slots.onKeyUp({ action: key } as any);
	await strip.onDialDown({ action: dial } as any);
	await strip.onTouchTap({ action: dial, payload: { tapPos: [20, 20] } } as any);
	expect(count() - before).toBe(3);
});
test("live polls retain aliases across page rotation, theme changes, reorder and new panes", async () => {
	const raw = (pane_id: string, seq = 0, agent_status = "blocked") => ({
		pane_id,
		workspace_id: "w",
		name: `PRIVATE ${pane_id}`,
		agent_status,
		state_change_seq: seq,
	});
	writeFileSync(`${dir}/agents.json`, JSON.stringify([raw("p"), raw("p2"), raw("p3")]));
	await state.refresh();
	state.setSlots([{ id: key.id, deviceId: key.device.id, column: 0, row: 0 }]);
	state.toggleShowcase();
	const strip = new AgentsDial();
	expect(state.displayAgentAt(0)?.workspace).toBe("AGENT A");
	strip.onDialRotate({ action: dial, payload: { ticks: 1 } } as any);
	expect(state.displayAgentAt(0)?.workspace).toBe("AGENT B");
	strip.onDialRotate({ action: { ...dial, coordinates: { column: 3, row: 0 } }, payload: { ticks: 1 } } as any);
	expect(state.displayAgentAt(0)?.workspace).toBe("AGENT B");
	writeFileSync(`${dir}/agents.json`, JSON.stringify([raw("p3", 99), raw("p4", 100), raw("p"), raw("p2", 1, "done")]));
	await state.refresh();
	expect(state.displayAgentAt(0)?.workspace).toBe("AGENT C");
	state.turnPage(-1);
	expect(state.displayAgentAt(0)?.workspace).toBe("AGENT D");
	state.turnPage(3);
	expect(state.displayAgentAt(0)?.workspace).toBe("AGENT B");
	expect(state.displayAgentAt(0)?.status).toBe("done");
	expect(state.displayAgentAt(0)?.subtitle).toBe("AGENT B");
	state.toggleShowcase();
});
test("actual dial feedback preserves showcase badges beside a double-digit pager", async () => {
	const { PNG } = await import("pngjs");
	const { Canvas, drawText, FONT_3X5, textWidth } = await import("../src/pixel");
	const { P, showcaseMarker } = await import("../src/render");
	const roster = readFileSync(`${dir}/agents.json`, "utf8");
	writeFileSync(`${dir}/agents.json`, JSON.stringify(Array.from({ length: 10 }, (_, i) => ({
		pane_id: `pager-${i}`, workspace_id: "w", name: `PRIVATE ${i}`, agent_status: "blocked",
	}))));
	await state.refresh();
	state.setSlots([{ id: key.id, deviceId: key.device.id, column: 0, row: 0 }]);
	state.turnPage(-state.page);
	state.toggleShowcase();
	const feedback = new Map<number, string>();
	const strip = new AgentsDial();
	Object.defineProperty(strip, "actions", { configurable: true, value: Array.from({ length: 4 }, (_, column) => ({
		...dial, id: `pager-dial-${column}`, coordinates: { column, row: 0 },
		setFeedback: async (f: { canvas: string }) => { feedback.set(column, f.canvas); },
	})) });
	const rendered = (column: number) => {
		const png = PNG.sync.read(Buffer.from(feedback.get(column)!.split(",")[1]!, "base64"));
		const canvas = new Canvas(png.width, png.height);
		png.data.copy(canvas.data);
		return canvas;
	};
	try {
		strip.onWillAppear();
		expect(state.pageCount).toBe(10);
		for (const page of [0, 9]) {
			while (state.page !== page) strip.onDialRotate({ action: dial, payload: { ticks: 1 } } as any);
			const badge = new Canvas(200, 100);
			showcaseMarker(badge, 0, 89, 200);
			for (let column = 0; column < 4; column++) {
				expect(rendered(column).crop(3, 89, 194, 11).data.equals(badge.crop(3, 89, 194, 11).data)).toBe(true);
			}
			const pager = `KEYS ${page + 1}/10`;
			const width = textWidth(pager, 2, FONT_3X5);
			const x = 200 - width - 6;
			const expected = new Canvas(200, 100);
			drawText(expected, pager, x, 72, 2, P.silver, P.black, FONT_3X5);
			// Assert the opaque glyph pixels, allowing the scene to show through between letters.
			const actual = rendered(3);
			const glyphPixels = (canvas: InstanceType<typeof Canvas>) => Buffer.concat(
				Array.from({ length: expected.data.length / 4 }, (_, pixel) => pixel * 4)
					.filter((i) => expected.data[i + 3] === 255)
					.map((i) => canvas.data.subarray(i, i + 4)),
			);
			expect(glyphPixels(actual)).toEqual(glyphPixels(expected));
		}
		state.toggleShowcase();
		const pager = "KEYS 10/10";
		const x = 200 - textWidth(pager, 2, FONT_3X5) - 6;
		const expected = new Canvas(200, 100);
		drawText(expected, pager, x, 86, 2, P.silver, P.black, FONT_3X5);
		const normal = rendered(3);
		expect(Array.from({ length: expected.data.length / 4 }, (_, pixel) => pixel * 4)
			.filter((i) => expected.data[i + 3] === 255)
			.every((i) => normal.data.subarray(i, i + 4).equals(expected.data.subarray(i, i + 4)))).toBe(true);
	} finally {
		Object.defineProperty(strip, "actions", { value: [] });
		strip.onWillDisappear();
		await new Promise<void>((resolve) => queueMicrotask(resolve));
		if (state.showcase) state.toggleShowcase();
		writeFileSync(`${dir}/agents.json`, roster);
		await state.refresh();
		state.turnPage(-state.page);
	}
});

const { PNG } = await import("pngjs");
const { Canvas } = await import("../src/pixel");
const { showcaseMarker } = await import("../src/render");

async function controlled(run: (notify: () => void, deviceScene: () => import("../src/scene").Scene) => Promise<void>) {
	const descriptors = Object.getOwnPropertyDescriptors(state);
	let listener = () => {};
	const theme = state.theme;
	let scene = theme.scene.fork();
	Object.defineProperties(state, {
		theme: { configurable: true, get: () => ({ ...theme, scene: { ...theme.scene, fork: () => (scene = theme.scene.fork()) } }) },
		frame: { configurable: true, get: () => 100 },
		themeBanner: { configurable: true, get: () => null },
		subscribe: { configurable: true, value: (fn: () => void) => { listener = fn; return () => { listener = () => {}; }; } },
	});
	try { await run(() => listener(), () => scene); }
	finally { Object.defineProperties(state, descriptors); }
}
function lifecycleDial(id: string, column: number, feedback: string[]) {
	return {
		id, device: { id: "d" }, coordinates: { column, row: 0 }, isDial: () => true,
		setFeedback: async (f: { canvas: string }) => { feedback.push(f.canvas); },
		showAlert: async () => {},
	};
}
function actions(strip: InstanceType<typeof AgentsDial>, value: unknown[]) {
	Object.defineProperty(strip, "actions", { configurable: true, value });
}

test("second native dial appearing in the same frame receives its SHOWCASE badge", async () => {
	await controlled(async () => {
		if (!state.showcase) state.toggleShowcase();
		const firstFeedback: string[] = [], secondFeedback: string[] = [];
		const first = lifecycleDial("first", 0, firstFeedback), second = lifecycleDial("second", 1, secondFeedback);
		const strip = new AgentsDial();
		try {
			actions(strip, [first]);
			strip.onWillAppear();
			actions(strip, [first, second]);
			strip.onWillAppear();
			expect(secondFeedback.length).toBe(1);
			const png = PNG.sync.read(Buffer.from(secondFeedback[0]!.split(",")[1]!, "base64"));
			const actual = new Canvas(png.width, png.height); png.data.copy(actual.data);
			const expected = new Canvas(200, 100); showcaseMarker(expected, 0, 89, 200);
			expect(actual.crop(3, 89, 194, 11).data).toEqual(expected.crop(3, 89, 194, 11).data);
		} finally {
			actions(strip, []); strip.onWillDisappear({ action: second } as any);
			await new Promise<void>((resolve) => queueMicrotask(resolve));
			if (state.showcase) state.toggleShowcase();
		}
	});
});

test("same-frame key layout changes refresh native feedback and touch targets", async () => {
	await controlled(async (notify, deviceScene) => {
		const agent = { paneId: "layout-pane", workspace: "Layout", title: "Layout", status: "blocked", focused: false, seq: 0, identity: "Layout" };
		const roster = [agent];
		Object.defineProperties(state, {
			agents: { configurable: true, get: () => roster },
			agentAt: { configurable: true, value: () => agent },
			visible: { configurable: true, value: (deviceId?: string) => state.resolved().filter((slot) => deviceId === undefined || slot.deviceId === deviceId).map((slot) => ({ ...slot, agent })) },
			canFocus: { configurable: true, get: () => true },
			focusPermission: { configurable: true, value: () => () => false },
		});
		state.setSlots([{ id: key.id, deviceId: key.device.id, column: 0, row: 0 }]);
		const feedback: string[] = [];
		let alerts = 0;
		const action = { ...lifecycleDial("layout-dial", 0, feedback), showAlert: async () => { alerts++; } };
		const strip = new AgentsDial();
		actions(strip, [action]);
		try {
			strip.onWillAppear();
			expect(deviceScene().agentAt(50)?.paneId).toBe("layout-pane");
			const initial = feedback[0];
			state.setSlots([{ id: key.id, deviceId: key.device.id, column: 1, row: 1 }]);
			notify();
			expect(feedback.at(-1)).not.toBe(initial);
			expect(deviceScene().agentAt(50)).toBeUndefined();
			expect(deviceScene().agentAt(250)?.paneId).toBe("layout-pane");
			await strip.onTouchTap({ action, payload: { tapPos: [50, 20] } } as any);
			expect(alerts).toBe(1);
		} finally {
			actions(strip, []); strip.onWillDisappear({ action } as any);
			await new Promise<void>((resolve) => queueMicrotask(resolve));
			state.setSlots([]);
		}
	});
});

test("a disappeared native dial receives feedback again when its context reappears", async () => {
	await controlled(async (notify) => {
		const feedback: string[] = [], otherFeedback: string[] = [];
		const action = lifecycleDial("returning", 0, feedback), other = lifecycleDial("remaining", 1, otherFeedback);
		const strip = new AgentsDial();
		try {
			actions(strip, [action, other]); strip.onWillAppear();
			expect(feedback.length).toBe(1);
			actions(strip, [other]); strip.onWillDisappear({ action } as any);
			await new Promise<void>((resolve) => queueMicrotask(resolve));
			notify();
			actions(strip, [action, other]); strip.onWillAppear();
			expect(feedback.length).toBe(2);
		} finally {
			actions(strip, []); strip.onWillDisappear({ action } as any);
			await new Promise<void>((resolve) => queueMicrotask(resolve));
		}
	});
});

test("touch handler refreshes same-frame layout before resolving an unnotified tap", async () => {
	await controlled(async (_notify, deviceScene) => {
		const agent = { paneId: "tap-pane", workspace: "Tap", title: "Tap", status: "blocked", focused: false, seq: 0, identity: "Tap" };
		const roster = [agent];
		Object.defineProperties(state, {
			agents: { configurable: true, get: () => roster },
			agentAt: { configurable: true, value: () => agent },
			visible: { configurable: true, value: (deviceId?: string) => state.resolved().filter((slot) => deviceId === undefined || slot.deviceId === deviceId).map((slot) => ({ ...slot, agent })) },
			canFocus: { configurable: true, get: () => true },
			focusPermission: { configurable: true, value: () => () => false },
		});
		state.setSlots([{ id: key.id, deviceId: key.device.id, column: 0, row: 0 }]);
		let alerts = 0;
		const action = { ...lifecycleDial("tap-dial", 0, []), showAlert: async () => { alerts++; } };
		const strip = new AgentsDial(); actions(strip, [action]);
		try {
			strip.onWillAppear();
			expect(deviceScene().agentAt(50)?.paneId).toBe("tap-pane");
			state.setSlots([{ id: key.id, deviceId: key.device.id, column: 1, row: 0 }]);
			await strip.onTouchTap({ action, payload: { tapPos: [50, 20] } } as any);
			expect(alerts).toBe(1);
			expect(deviceScene().agentAt(250)?.paneId).toBe("tap-pane");
		} finally {
			actions(strip, []); strip.onWillDisappear({ action } as any);
			await new Promise<void>((resolve) => queueMicrotask(resolve));
			state.setSlots([]);
		}
	});
});