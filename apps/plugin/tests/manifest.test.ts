import { test, expect } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
test("cloud monitor is a dedicated optional read-only native key with original icon and runtime registration", () => {
 const root = `${process.cwd()}/dev.fedeya.corral.sdPlugin`;
 const manifest = JSON.parse(readFileSync(`${root}/manifest.json`, "utf8"));
 const action = manifest.Actions.find((a: { UUID: string }) => a.UUID === "dev.fedeya.corral.cloud");
 expect(action?.Name).toBe("Cursor Cloud Agent");
 expect(action?.Controllers).toEqual(["Keypad"]);
 expect(action?.SupportedInMultiActions).toBe(false);
 expect(action?.UserTitleEnabled).toBe(false);
 expect(existsSync(`${root}/${action?.Icon}.svg`)).toBe(true);
 expect(readFileSync("src/plugin.ts", "utf8")).toContain("registerAction(new CloudAgent())");
});

test("showcase is registered as an optional native key with original icon", () => {
	const root = `${process.cwd()}/dev.fedeya.corral.sdPlugin`;
	const manifest = JSON.parse(readFileSync(`${root}/manifest.json`, "utf8"));
	const action = manifest.Actions.find((a: any) => a.UUID === "dev.fedeya.corral.showcase");
	expect(action?.Controllers).toEqual(["Keypad"]);
	expect(action?.SupportedInMultiActions).toBe(false);
	expect(existsSync(`${root}/${action?.Icon}.svg`)).toBe(true);
	expect(readFileSync("src/plugin.ts", "utf8")).toContain("registerAction(new ShowcaseToggle())");
});
