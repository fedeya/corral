import { closeSync, constants, fstatSync, lstatSync, openSync, readSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { homedir } from "node:os";
import { inflateSync } from "node:zlib";
import { PNG } from "pngjs";

export const MASCOT_STATUSES = ["idle", "unknown", "working", "blocked", "done"] as const;
export type MascotMetadata = {
	version: 1;
	name: string;
	author: string;
	license: string;
	atlas: "mascot.png";
	frameWidth: number;
	frameHeight: number;
};
export type MascotPack = { metadata: MascotMetadata; image: PNG };
export type MascotResult = { pack: MascotPack; error?: never } | { pack?: never; error: string };

function parseMetadata(bytes: Buffer): MascotMetadata {
	const value: unknown = JSON.parse(bytes.toString("utf8"));
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("schema");
	const m = value as Record<string, unknown>;
	const fields = ["version", "name", "author", "license", "atlas", "frameWidth", "frameHeight"];
	if (Object.keys(m).length !== fields.length || fields.some((key) => !Object.hasOwn(m, key))) throw new Error("schema");
	for (const key of ["name", "author", "license"]) {
		const text = m[key];
		if (typeof text !== "string" || !text.trim() || text.length > 80 || /[\u0000-\u001f\u007f]/.test(text)) throw new Error("schema");
	}
	if (m.version !== 1 || m.atlas !== "mascot.png") throw new Error("schema");
	for (const key of ["frameWidth", "frameHeight"]) {
		const n = m[key];
		if (typeof n !== "number" || !Number.isInteger(n) || n < 8 || n > 64) throw new Error("schema");
	}
	return m as MascotMetadata;
}

function checkDirectory(directory: string): void {
	for (let path = directory; ; path = dirname(path)) {
		const stat = lstatSync(path);
		if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("directory");
		if (dirname(path) === path) break;
	}
}

function readData(directory: string, name: string): Buffer {
	checkDirectory(directory);
	const path = join(directory, name);
	const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	try {
		const stat = fstatSync(fd);
		const limit = name === "mascot.json" ? 8192 : 256 * 1024;
		if (!stat.isFile() || stat.size < 1 || stat.size > limit) throw new Error("file");
		// A capped read also handles a file growing after fstat; never read an unbounded fd.
		const buffer = Buffer.alloc(limit + 1);
		let size = 0;
		while (size < buffer.length) {
			const count = readSync(fd, buffer, size, buffer.length - size, null);
			if (!count) break;
			size += count;
		}
		if (size > limit || size !== stat.size) throw new Error("size");
		const bytes = buffer.subarray(0, size);
		checkDirectory(directory);
		const after = lstatSync(path);
		if (after.isSymbolicLink() || after.ino !== stat.ino || after.dev !== stat.dev) throw new Error("changed");
		return bytes;
	} finally { closeSync(fd); }
}

function decodeAtlas(bytes: Buffer, metadata: MascotMetadata): PNG {
	if (bytes.length < 45 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error("PNG");
	if (bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error("IHDR");
	const width = bytes.readUInt32BE(16);
	const height = bytes.readUInt32BE(20);
	if (width !== metadata.frameWidth * 2 || height !== metadata.frameHeight * 5 || width > 128 || height > 320) throw new Error("dimensions");
	// Only 8-bit RGBA, standard compression/filter, non-interlaced. No APNG or metadata chunks.
	if (!bytes.subarray(24, 29).equals(Buffer.from([8, 6, 0, 0, 0]))) throw new Error("format");
	let offset = 33;
	const compressed: Buffer[] = [];
	let ended = false;
	while (offset + 12 <= bytes.length) {
		const length = bytes.readUInt32BE(offset);
		const type = bytes.toString("ascii", offset + 4, offset + 8);
		if (length > bytes.length - offset - 12) throw new Error("chunk");
		if (type === "IDAT" && !ended) compressed.push(bytes.subarray(offset + 8, offset + 8 + length));
		else if (type === "IEND" && length === 0 && compressed.length > 0) ended = true;
		else throw new Error("chunk");
		offset += length + 12;
		if (ended) break;
	}
	if (!ended || offset !== bytes.length) throw new Error("end");
	const scanlineBytes = (width * 4 + 1) * height; // At most 164,160 bytes, including PNG filters.
	if (inflateSync(Buffer.concat(compressed), { maxOutputLength: scanlineBytes }).length !== scanlineBytes) throw new Error("inflate");
	return PNG.sync.read(bytes, { checkCRC: true });
}

export function mascotDirectory(env: Record<string, string | undefined> = process.env, home = homedir()): string {
	return env.CORRAL_MASCOT_DIR ?? join(home, "Library", "Application Support", "Corral", "mascot");
}

export function loadMascotPack(directory = mascotDirectory()): MascotResult {
	try {
		directory = resolve(directory);
		if (directory.split(sep).some((part) => part.toLowerCase().endsWith(".sdplugin"))) throw new Error("bundle");
		const metadata = parseMetadata(readData(directory, "mascot.json"));
		return { pack: { metadata, image: decodeAtlas(readData(directory, "mascot.png"), metadata) } };
	} catch {
		// Never surface filesystem errors, metadata or local paths on the strip or in Showcase.
		return { error: "Mascot pack unavailable" };
	}
}
