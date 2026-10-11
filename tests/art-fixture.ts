// Original procedural sheets for testing the real Kingdom renderer without licensed art.
import { mkdirSync, cpSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
export const imgs = `${process.env.TMPDIR}/corral-test-art-${process.pid}`;
mkdirSync(`${imgs}/kingdom`, { recursive: true });
cpSync(`${process.cwd()}/dev.fedeya.corral.sdPlugin/imgs`, imgs, { recursive: true });
function sheet(name: string, width: number, height: number) {
	const png = new PNG({ width, height });
	for (let y = 55; y < Math.min(height, 134); y++)
		for (let x = 60; x < Math.min(width, 130); x++) {
			const i = (y * width + x) * 4;
			png.data[i] = 240;
			png.data[i + 1] = 190;
			png.data[i + 2] = 90;
			png.data[i + 3] = 255;
		}
	writeFileSync(`${imgs}/kingdom/${name}.png`, PNG.sync.write(png));
}
const anims = [
	"Idle",
	"Run",
	...["Axe", "Pickaxe", "Hammer", "Knife"].flatMap((a) => [`Idle${a}`, `Run${a}`, `Interact${a}`]),
	...["Wood", "Gold", "Meat"].flatMap((a) => [`Idle${a}`, `Run${a}`]),
];
for (const team of ["Blue", "Red", "Yellow", "Purple", "Black"])
	for (const anim of anims) sheet(`${team}_${anim}`, 192, 192);
for (const name of [
	"Castle",
	"Tree",
	"GoldStone",
	"House_Red",
	"House_Yellow",
	"House_Blue",
	"Bush",
	"Sheep",
	"Stump",
	"Meat",
])
	sheet(name, 320, 256);
process.env.CORRAL_IMGS = imgs;
