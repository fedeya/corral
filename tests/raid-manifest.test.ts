import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

test("Raid Round is a registered standalone keypad action with shipped icon", () => {
 const root = resolve(import.meta.dirname, "..");
 const manifest = JSON.parse(readFileSync(resolve(root, "dev.fedeya.corral.sdPlugin/manifest.json"), "utf8"));
 const action = manifest.Actions.find((a: { UUID: string }) => a.UUID === "dev.fedeya.corral.raid");
 assert.ok(action);
 assert.deepEqual(action.Controllers, ["Keypad"]);
 assert.equal(action.SupportedInMultiActions, false);
 assert.ok(existsSync(resolve(root, `dev.fedeya.corral.sdPlugin/${action.Icon}.svg`)));
 assert.match(readFileSync(resolve(root, "src/plugin.ts"), "utf8"), /registerAction\(new RaidAction\(\)\)/);
});
