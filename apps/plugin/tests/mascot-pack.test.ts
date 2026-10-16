import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync, renameSync, readFileSync, cpSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { deflateSync } from "node:zlib";
import { spawnSync } from "node:child_process";

const api = await import("../src/mascot-pack").catch(() => null);
const metadata = {
	version: 1,
	name: "Original test mascot",
	author: "Corral test artist",
	license: "MIT",
	atlas: "mascot.png",
	frameWidth: 16,
	frameHeight: 16,
};
function fixture(run: (dir: string) => void): void {
	// macOS's system temp directory can itself contain symlink ancestors.
	const dir = realpathSync(mkdtempSync(join(process.env.TMPDIR!, "mascot-pack-")));
	try {
		writeFileSync(join(dir, "mascot.json"), JSON.stringify(metadata));
		const image = new PNG({ width: 32, height: 80 });
		for (let row = 0; row < 5; row++) for (let frame = 0; frame < 2; frame++) {
			for (let y = row * 16; y < (row + 1) * 16; y++) for (let x = frame * 16; x < (frame + 1) * 16; x++) {
				const i = (y * image.width + x) * 4;
				image.data.set([40 + row * 40, 60 + frame * 100, 180, 255], i);
			}
		}
		writeFileSync(join(dir, "mascot.png"), PNG.sync.write(image));
		run(dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

test("loads a local two-frame, five-status PNG atlas with explicit artist and license", () => {
	assert.ok(api, "local mascot pack loader must exist");
	fixture((dir) => {
		const result = api.loadMascotPack(dir);
		assert.ok(result.pack, result.error);
		assert.equal(result.pack.metadata.author, metadata.author);
		assert.equal(result.pack.metadata.license, "MIT");
		assert.equal(result.pack.image.width, 32);
		assert.equal(result.pack.image.height, 80);
		assert.deepEqual(api.MASCOT_STATUSES, ["idle", "unknown", "working", "blocked", "done"]);
	});
});

test("rejects malformed, ambiguous or executable metadata with one path-free error", () => {
	assert.ok(api);
	const invalid = [
		"not JSON", "null", "[]", JSON.stringify({ ...metadata, version: 2 }),
		JSON.stringify({ ...metadata, author: "" }), JSON.stringify({ ...metadata, license: "  " }),
		JSON.stringify({ ...metadata, name: "x".repeat(81) }),
		JSON.stringify({ ...metadata, script: "run.ts" }),
		JSON.stringify({ ...metadata, atlas: "../mascot.png" }),
		JSON.stringify({ ...metadata, atlas: "/Users/secret/mascot.png" }),
		JSON.stringify({ ...metadata, atlas: "https://example.com/a.png" }),
		JSON.stringify({ ...metadata, frameWidth: 16.5 }),
		JSON.stringify({ ...metadata, frameHeight: 65 }),
		JSON.stringify({ ...metadata, frameHeight: 0 }),
		JSON.stringify({ ...metadata, license: null }),
	];
	fixture((dir) => {
		for (const text of invalid) {
			writeFileSync(join(dir, "mascot.json"), text);
			assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" }, text);
		}
		rmSync(join(dir, "mascot.json"));
		assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" });
	});
});

test("does not follow symlinks at the pack, ancestor or either data file", () => {
	assert.ok(api);
	fixture((dir) => {
		for (const name of ["mascot.json", "mascot.png"]) {
			const path = join(dir, name);
			renameSync(path, `${path}.real`);
			symlinkSync(`${path}.real`, path);
			assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" });
			rmSync(path);
			renameSync(`${path}.real`, path);
		}
		const alias = `${dir}-link`;
		try {
			symlinkSync(dir, alias, "dir");
			assert.deepEqual(api.loadMascotPack(alias), { error: "Mascot pack unavailable" });
			mkdirSync(join(dir, "nested"));
			for (const file of ["mascot.json", "mascot.png"]) cpSync(join(dir, file), join(dir, "nested", file));
			assert.deepEqual(api.loadMascotPack(join(alias, "nested")), { error: "Mascot pack unavailable" });
		} finally { rmSync(alias, { force: true }); }
	});
});


test("bounds JSON and compressed PNG bytes before parsing or decoding", () => {
	assert.ok(api);
	fixture((dir) => {
		writeFileSync(join(dir, "mascot.json"), JSON.stringify(metadata) + " ".repeat(8192));
		assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" });
		writeFileSync(join(dir, "mascot.json"), JSON.stringify(metadata));
		const tiny = PNG.sync.write(new PNG({ width: 32, height: 80 }));
		writeFileSync(join(dir, "mascot.png"), Buffer.concat([tiny, Buffer.alloc(256 * 1024)]));
		assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" });
		rmSync(join(dir, "mascot.png"));
		mkdirSync(join(dir, "mascot.png"));
		assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" });
	});
});


test("checks the PNG envelope, fixed atlas dimensions and RGBA format before decoding", () => {
	assert.ok(api);
	fixture((dir) => {
		for (const [width, height] of [[32, 81], [16, 160], [512, 512]]) {
			writeFileSync(join(dir, "mascot.png"), PNG.sync.write(new PNG({ width, height })));
			assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" });
		}
		const valid = PNG.sync.write(new PNG({ width: 32, height: 80 }));
		for (const bad of [
			Buffer.from("not a PNG"), valid.subarray(0, 32),
			Buffer.concat([valid, Buffer.from("extra")]),
			PNG.sync.write(new PNG({ width: 32, height: 80 }), { colorType: 2 }),
		]) {
			writeFileSync(join(dir, "mascot.png"), bad);
			assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" });
		}
		const hugeHeader = Buffer.from(valid);
		hugeHeader.writeUInt32BE(0xffffffff, 16);
		writeFileSync(join(dir, "mascot.png"), hugeHeader);
		assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" });
	});
});


function chunk(type: string, data: Buffer): Buffer {
	const body = Buffer.concat([Buffer.from(type), data]);
	let crc = 0xffffffff;
	for (const byte of body) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
	}
	const out = Buffer.alloc(data.length + 12);
	out.writeUInt32BE(data.length, 0);
	body.copy(out, 4);
	out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4);
	return out;
}

test("rejects a tiny compressed PNG whose inflated data exceeds the bounded scanlines", () => {
	assert.ok(api);
	fixture((dir) => {
		const valid = PNG.sync.write(new PNG({ width: 32, height: 80 }));
		const bomb = Buffer.concat([valid.subarray(0, 33), chunk("IDAT", deflateSync(Buffer.alloc(512 * 1024))), chunk("IEND", Buffer.alloc(0))]);
		assert.ok(bomb.length < 4096);
		writeFileSync(join(dir, "mascot.png"), bomb);
		const decode = PNG.sync.read;
		let decodes = 0;
		// Observe the real decoder boundary: a bomb must be rejected before it is called.
		PNG.sync.read = (...args) => { decodes++; return decode(...args); };
		try {
			assert.deepEqual(api.loadMascotPack(dir), { error: "Mascot pack unavailable" });
			assert.equal(decodes, 0, "inflated budget must be checked before image decoding");
		} finally { PNG.sync.read = decode; }
	});
});


test("uses an external macOS support directory by default and an explicit local override", () => {
	assert.ok(api);
	assert.equal(api.mascotDirectory({}, "/Users/Artist"), "/Users/Artist/Library/Application Support/Corral/mascot");
	assert.equal(api.mascotDirectory({ CORRAL_MASCOT_DIR: "/local/art" }, "/Users/Artist"), "/local/art");
	fixture((dir) => {
		const previous = process.env.CORRAL_MASCOT_DIR;
		process.env.CORRAL_MASCOT_DIR = dir;
		try { assert.ok(api.loadMascotPack().pack); }
		finally {
			if (previous === undefined) delete process.env.CORRAL_MASCOT_DIR;
			else process.env.CORRAL_MASCOT_DIR = previous;
		}
	});
});


test("INVITADO draws the correct atlas cell for every status on real keys and strip", async () => {
	assert.ok(api);
	const guest = await import("../src/themes/guest").catch(() => null);
	assert.ok(guest, "Invitado theme must exist");
	fixture((dir) => {
		const result = api.loadMascotPack(dir);
		assert.ok(result.pack);
		const theme = guest.createGuestTheme(result.pack);
		assert.equal(theme.id, "guest");
		assert.equal(theme.name, "INVITADO");
		for (const [row, status] of api.MASCOT_STATUSES.entries()) {
			const agent = { paneId: "p1", identity: "private", workspace: "PROJECT", title: "TASK", status, focused: false, seq: 1 };
			for (const frame of [0, 4]) {
				assert.equal(theme.keyFrame(agent, frame), frame / 4);
				const key = theme.drawKey(agent, frame);
				const color = [40 + row * 40, 60 + (frame / 4) * 100, 180];
				assert.deepEqual([...key.data.subarray((40 * 120 + 60) * 4, (40 * 120 + 60) * 4 + 3)], color);
				const strip = theme.scene.render([{ column: 0, row: 0, agent }], frame, 12);
				assert.ok(strip.data.some((_, i) => i % 4 === 0 && strip.data[i] === color[0] && strip.data[i + 1] === color[1] && strip.data[i + 2] === color[2]));
			}
		}
	});
});


function startup(dir: string, remove = false): { ids: string[]; name: string | null; stable: boolean; farm: boolean } {
	const root = process.cwd();
	const child = spawnSync(process.execPath, [join(root, "tests/fixtures/mascot-startup.ts")], {
		cwd: dir,
		env: { ...process.env, CORRAL_IMGS: join(root, "dev.fedeya.corral.sdPlugin/imgs"), CORRAL_MASCOT_DIR: dir, MASCOT_REMOVE_AFTER_START: remove ? "1" : "" },
		encoding: "utf8",
		timeout: 10_000,
	});
	assert.equal(child.status, 0, child.stderr);
	return JSON.parse(child.stdout);
}

test("startup registers INVITADO only for a valid external pack and holds one restart-scoped snapshot", { timeout: 30_000 }, () => {
	fixture((dir) => {
		const loaded = startup(dir, true);
		assert.ok(loaded.ids.includes("guest"), "valid local pack must register Invitado");
		assert.equal(loaded.name, "INVITADO");
		assert.equal(loaded.stable, true);
		assert.equal(loaded.farm, true);
		const restarted = startup(dir);
		assert.equal(restarted.ids.includes("guest"), false);
		assert.equal(restarted.farm, true);
		writeFileSync(join(dir, "mascot.json"), "INVALID /Users/secret/private");
		const invalid = startup(dir);
		assert.equal(invalid.ids.includes("guest"), false);
		assert.equal(invalid.farm, true);
	});
});


test("ships an original MIT Luma pack outside the native bundle with byte-reproducible TypeScript art", () => {
	assert.ok(api);
	const example = join(process.cwd(), "../../examples/mascot-packs/luma");
	const loaded = api.loadMascotPack(example);
	assert.ok(loaded.pack, "shipped original mascot example must load");
	assert.equal(loaded.pack.metadata.license, "MIT");
	assert.match(readFileSync(join(example, "LICENSE"), "utf8"), /MIT License/);
	fixture((dir) => {
		const generated = spawnSync(process.execPath, [join(process.cwd(), "scripts/generate-mascot-example.ts"), dir], { encoding: "utf8", timeout: 10_000 });
		assert.equal(generated.status, 0, generated.stderr);
		for (const file of ["mascot.json", "mascot.png", "LICENSE"]) {
			assert.ok(readFileSync(join(dir, file)).equals(readFileSync(join(example, file))), file);
		}
	});
});


test("does not load custom pack data from inside a native plugin bundle", () => {
	assert.ok(api);
	fixture((dir) => {
		const bundled = join(dir, "example.sdPlugin", "mascot");
		mkdirSync(bundled, { recursive: true });
		for (const file of ["mascot.json", "mascot.png"]) cpSync(join(dir, file), join(bundled, file));
		assert.deepEqual(api.loadMascotPack(bundled), { error: "Mascot pack unavailable" });
	});
});
