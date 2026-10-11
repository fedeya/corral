import { test, expect } from "bun:test";
import "./art-fixture";
const { renderKey } = await import("../src/themes");
const { farm } = await import("../src/themes/farm");
const { Showcase } = await import("../src/showcase");
const agent = {
	paneId: "secret-pane",
	workspace: "PRIVATE",
	title: "SECRET",
	identity: "PRIVATE",
	status: "working" as const,
	focused: false,
	seq: 1,
};
test("render cache distinguishes workspace aliases with the same identity", () => {
	const mode = new Showcase();
	mode.toggle();
	const projected = mode.project(agent)!;
	const normal = renderKey(farm, { ...agent, subtitle: projected.subtitle }, 0, null);
	const safe = renderKey(farm, mode.project(agent), 0, null);
	expect(safe).not.toBe(normal);
	expect(safe).toBe(farm.drawKey(mode.project(agent)!, 0).toDataUrl());
	expect(renderKey(farm, { ...agent, subtitle: projected.subtitle }, 0, null) === normal).toBe(true);
});
test("both real theme renderers keep appearance pixels unchanged while labels are safe", async () => {
	const { kingdom } = await import("../src/themes/kingdom");
	const mode = new Showcase();
	mode.toggle();
	for (const theme of [farm, kingdom]) {
		theme.prepare?.([agent]);
		const safe = mode.project(agent)!;
		expect([safe.workspace, safe.title, safe.subtitle]).toEqual(["AGENT A", "AGENT A", "AGENT A"]);
		const normal = theme.drawKey(agent, 0);
		const projected = theme.drawKey(safe, 0);
		expect(normal.crop(0, 0, 120, 78).data.equals(projected.crop(0, 0, 120, 78).data)).toBe(true);
		const visible = [{ column: 0, row: 0, agent }];
		const original = theme.scene.render(visible, 0, 12);
		const shown = theme.scene.render([{ ...visible[0]!, agent: safe }], 0, 12, true);
		expect(original.crop(0, 40, 800, 48).data.equals(shown.crop(0, 40, 800, 48).data)).toBe(true);
		expect(original.data.equals(shown.data)).toBe(false);
	}
});
test("showcase errors use a fixed safe caption, including empty keys", () => {
	const secret = "PRIVATE CLIENT / SECRET TASK / /Users/private";
	expect(renderKey(farm, undefined, 0, secret, true) === renderKey(farm, undefined, 0, "herdr off", true)).toBe(true);
	expect(renderKey(farm, undefined, 0, null, true) === renderKey(farm, undefined, 0, null)).toBe(false);
});
test("camera marker renders a legible double-scale SHOWCASE caption", async () => {
	const { Canvas, drawText, textWidth, FONT_3X5 } = await import("../src/pixel");
	const { showcaseMarker, P } = await import("../src/render");
	const c = new Canvas(120, 120);
	showcaseMarker(c);
	const expected = new Canvas(120, 120);
	expected.rect(0, 0, 120, 120, P.black);
	const w = textWidth("SHOWCASE", 2, FONT_3X5);
	const x = Math.round((120 - w) / 2);
	drawText(expected, "SHOWCASE", x, 107, 2, P.yellow, undefined, FONT_3X5);
	expect(c.crop(x, 107, w, 10).data.equals(expected.crop(x, 107, w, 10).data)).toBe(true);
});
