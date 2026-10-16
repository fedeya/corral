// Original Luma pixel art and generator, MIT (see generated LICENSE). No third-party art.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const out = process.argv[2] ?? fileURLToPath(new URL("../../../examples/mascot-packs/luma/", import.meta.url));
const image = new PNG({ width: 64, height: 160 });
const statuses = ["idle", "unknown", "working", "blocked", "done"] as const;
for (const [row, status] of statuses.entries()) for (let frame = 0; frame < 2; frame++) {
	const bob = status === "working" || status === "blocked" ? -frame : 0;
	const outline = "#142b3b";
	const shell = status === "idle" ? "#71968a" : status === "unknown" ? "#ae9ac7" : "#efb667";
	const shade = status === "idle" ? "#47695e" : status === "unknown" ? "#77638e" : "#be7757";
	const glow = status === "idle" ? "#b0c2a4" : status === "blocked" ? "#ff9a87" : "#fff1bc";
	function rect(x: number, y: number, w: number, h: number, color: string): void {
		const n = Number.parseInt(color.slice(1), 16);
		for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
			const px = x + dx;
			const py = y + dy + bob;
			if (px < 0 || px >= 32 || py < 0 || py >= 32) throw new Error("art outside cell");
			image.data.set([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], ((row * 32 + py) * 64 + frame * 32 + px) * 4);
		}
	}
	// A tiny walking greenhouse lantern: leaf aerial, brass shell and a warm glass face.
	rect(9 + frame, 27, 4, 3 - frame, outline);
	rect(20 - frame, 27, 4, 2 + frame, outline);
	rect(15, 4, 2, 7, outline);
	rect(10, 4, 6, 3, "#42b5a3");
	rect(11, 7, 4, 1, "#248578");
	rect(17, 2 + frame, 5, 3, "#7ed1a3");
	rect(17, 5, 3, 1, "#42b5a3");
	rect(9, 8, 14, 21, outline);
	rect(7, 10, 18, 17, outline);
	rect(10, 9, 12, 19, shell);
	rect(8, 11, 16, 15, shell);
	rect(8, 23, 16, 3, shade);
	rect(10, 26, 12, 2, shade);
	rect(9, 12, 14, 11, outline);
	rect(10, 13, 12, 9, glow);
	rect(11, 13, 2, 1, "#fff8e0");
	const sleepy = (status === "idle" || status === "unknown") && frame === 1;
	rect(12, sleepy ? 17 : 16, 2, sleepy ? 1 : 3, outline);
	rect(18, sleepy ? 17 : 16, 2, sleepy ? 1 : 3, outline);
	rect(15, 20, 2, 1, shade);
	if (status === "done") { rect(14, 19, 1, 1, shade); rect(17, 19, 1, 1, shade); }
	rect(4, 17 + frame, 3, 5, outline);
	rect(5, 17 + frame, 2, 3, shell);
	rect(25, status === "blocked" ? 11 + frame : 17 - frame, 3, 5, outline);
	rect(25, status === "blocked" ? 11 + frame : 17 - frame, 2, 3, shell);
	if (status === "working" || status === "done") {
		const y = 7 + frame;
		rect(3, y, 1, 5, "#ffe17c"); rect(1, y + 2, 5, 1, "#ffe17c");
	}
	if (status === "blocked") { rect(27, 3, 2, 4, "#ff817c"); rect(27, 8, 2, 1, "#ff817c"); }
	if (status === "unknown") { rect(26, 5, 3, 1, "#ddd3f4"); rect(28, 6, 1, 2, "#ddd3f4"); rect(27, 8, 1, 1, "#ddd3f4"); rect(27, 10, 1, 1, "#ddd3f4"); }
}
const metadata = {
	version: 1,
	name: "Luma — pocket greenhouse lantern",
	author: "Corral contributors",
	license: "MIT",
	atlas: "mascot.png",
	frameWidth: 32,
	frameHeight: 32,
};
const license = `MIT License

Copyright (c) 2026 Corral contributors

Luma is original pixel art created for Corral. This license covers the atlas,
metadata and TypeScript generator. No third-party art was used.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "mascot.json"), `${JSON.stringify(metadata, null, 2)}\n`);
writeFileSync(join(out, "mascot.png"), PNG.sync.write(image, { colorType: 6, bitDepth: 8 }));
writeFileSync(join(out, "LICENSE"), license);
console.log("Generated original MIT Luma mascot pack");
