import { test, expect } from "bun:test";
import "./art-fixture";
import { PNG } from "pngjs";
const { renderKey } = await import("../src/themes");
const { farm } = await import("../src/themes/farm");
const { Showcase } = await import("../src/showcase");
const { textWidth, FONT_3X5 } = await import("../src/pixel");
const textWidthOf = (text: string) => textWidth(text, 2, FONT_3X5);
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
	expect(renderKey(farm, undefined, 0, secret, false, true) === renderKey(farm, undefined, 0, "herdr off", false, true)).toBe(true);
	expect(renderKey(farm, undefined, 0, null, false, true) === renderKey(farm, undefined, 0, null)).toBe(false);
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
test("long labels loop a marquee, holding to read and taking turns line by line", async () => {
	const { labelOffsets } = await import("../src/render");
	const long = { ...agent, subtitle: "Backfill to skip extraction and more" };
	expect(labelOffsets("PRIVATE", "Short", 50)).toEqual([0, 0]);
	expect(labelOffsets("PRIVATE", long.subtitle, 15)).toEqual([0, 0]);
	expect(labelOffsets("PRIVATE", long.subtitle, 18)).toEqual([0, 8]);
	// Without a subtitle the workspace wraps to two lines first and only scrolls past that.
	expect(labelOffsets("name-parser-revalidate", undefined, 20)).toEqual([0, 0]);
	const huge = "citation-processor-v2/01-events-schema-and-more";
	expect(labelOffsets(huge, undefined, 18)).toEqual([8, 0]);
	// A word that would split across the two lines scrolls instead.
	expect(labelOffsets("coding-agents-stream-json-simulated-user", undefined, 18)).toEqual([8, 0]);
	// Both overflow: the workspace takes its lap first while the subtitle holds, then they swap, and it loops.
	expect(labelOffsets("name-parser-revalidate", long.subtitle, 18)).toEqual([8, 0]);
	const titleLap = 16 + Math.ceil((textWidthOf("name-parser-revalidate") + 24) / 4);
	expect(labelOffsets("name-parser-revalidate", long.subtitle, titleLap + 18)).toEqual([0, 8]);
	const subtitleLap = 16 + Math.ceil((textWidthOf(long.subtitle) + 24) / 4);
	expect(labelOffsets("name-parser-revalidate", long.subtitle, titleLap + subtitleLap + 18)).toEqual([8, 0]);

	const band = (a: typeof agent, frame: number) =>
		Buffer.from(png(renderKey(farm, a, frame, null)).data.subarray(94 * 120 * 4, 106 * 120 * 4));
	expect(band(long, 0).equals(band(long, 10))).toBe(true);
	expect(band(long, 0).equals(band(long, 30))).toBe(false);
	const short = { ...agent, subtitle: "Short" };
	expect(band(short, 0).equals(band(short, 40))).toBe(true);
});

const png = (url: string) => PNG.sync.read(Buffer.from(url.split(",")[1]!, "base64"));
test("pinned keys have a visible yellow pushpin marker including reserved empty keys", () => {
	const plain = renderKey(farm, agent, 0, null);
	const pinned = renderKey(farm, agent, 0, null, true);
	expect(pinned).not.toBe(plain);
	const empty = renderKey(farm, undefined, 0, null);
	const reserved = renderKey(farm, undefined, 0, null, true);
	expect(reserved).not.toBe(empty);
	for (const url of [pinned, reserved]) {
		const image = png(url);
		const i = (7 * image.width + 8) * 4;
		expect([...image.data.subarray(i, i + 3)]).toEqual([255, 236, 39]);
	}
});
