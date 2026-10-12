import { useEffect, useRef } from 'react';
import type { ThemeId } from './shared';
import goatUrl from '../../../plugin/dev.fedeya.corral.sdPlugin/imgs/goat-sheet.png';
import sheepUrl from '../../../plugin/dev.fedeya.corral.sdPlugin/imgs/sheep_walk.png';
import cowUrl from '../../../plugin/dev.fedeya.corral.sdPlugin/imgs/cow_walk.png';
import chickenUrl from '../../../plugin/dev.fedeya.corral.sdPlugin/imgs/chicken_walk.png';

const GLYPHS: Record<string, string[]> = {
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
};
const SPRITES = [
  { url: goatUrl, cell: 128, row: 3 },
  { url: sheepUrl, cell: 128, row: 3 },
  { url: cowUrl, cell: 128, row: 3 },
  { url: chickenUrl, cell: 32, row: 3 },
];
type LoadedSprite = { image: HTMLImageElement; cell: number; row: number; x: number; y: number; width: number; height: number };

async function loadSprite(source: typeof SPRITES[number]): Promise<LoadedSprite> {
  const image = new Image();
  image.src = source.url;
  await image.decode();
  const probe = document.createElement('canvas');
  probe.width = image.width;
  probe.height = source.cell;
  const context = probe.getContext('2d')!;
  context.drawImage(image, 0, source.row * source.cell, image.width, source.cell, 0, 0, image.width, source.cell);
  const pixels = context.getImageData(0, 0, image.width, source.cell).data;
  let left = source.cell, top = source.cell, right = 0, bottom = 0;
  for (let frame = 0; frame < 4; frame++) {
    for (let y = 0; y < source.cell; y++) {
      for (let x = 0; x < source.cell; x++) {
        if (pixels[(y * image.width + frame * source.cell + x) * 4 + 3]) {
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
      }
    }
  }
  return { image, cell: source.cell, row: source.row, x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
let spritePromise: Promise<LoadedSprite[]> | undefined;

export function TitleWorld({ title = false, variant = 0, needsHelp = false, resting = false, theme = 'farm' }: { title?: boolean; variant?: number; needsHelp?: boolean; resting?: boolean; theme?: ThemeId }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const screen = canvas.current;
    const context = screen?.getContext('2d');
    if (!screen || !context) return;
    const ctx = context;
    let cancelled = false;
    let frameRequest = 0;
    let previous = -100;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const background = document.createElement('canvas');
    background.width = background.height = 180;
    const bg = background.getContext('2d')!;
    bg.imageSmoothingEnabled = false;
    bg.fillStyle = '#101a20'; bg.fillRect(0, 0, 180, 180);
    const rect = (x: number, y: number, w: number, h: number, color: string) => { bg.fillStyle = color; bg.fillRect(x, y, w, h); };
    // The title is terrain, not a font placed over a landscape.
    if (title) {
      const cells: { x: number; y: number; top: boolean }[] = [];
      [...'CORRAL'].forEach((letter, index) => GLYPHS[letter].forEach((row, y) => [...row].forEach((pixel, x) => {
        if (pixel === '#') cells.push({ x: 20 + index * 24 + x * 4, y: 81 + y * 4, top: y === 0 || GLYPHS[letter][y - 1][x] !== '#' });
      })));
      for (const cell of cells) { rect(cell.x + 2, cell.y + 7, 4, 4, '#223b35'); rect(cell.x + 1, cell.y + 5, 4, 4, '#3c5240'); }
      for (const cell of cells) {
        rect(cell.x, cell.y, 4, 4, '#e6d5b2');
        rect(cell.x, cell.y + 3, 4, 1, '#bda784');
        if ((cell.x + cell.y) % 5 === 0) rect(cell.x + 2, cell.y + 1, 1, 1, '#cfbb96');
        if (cell.top) { rect(cell.x, cell.y, 4, 1, '#9db57b'); rect(cell.x + 1, cell.y - 1, 1, 1, '#789b68'); }
      }
      // Tiny timber scaffold, a sleeping spot and a ladder between two letter ledges.
      rect(122, 77, 1, 32, '#887653'); rect(130, 77, 1, 32, '#887653');
      for (let y = 80; y < 109; y += 4) rect(122, y, 9, 1, '#b9a174');
      rect(155, 104, 12, 2, '#415440');
      rect(8, 128, 46, 2, '#294634'); rect(13, 130, 32, 3, '#23382e');
      rect(137, 138, 31, 2, '#294634'); rect(140, 140, 23, 3, '#23382e');
      rect(27, 115, 134, 1, '#203b34');
    } else {
      const ground = 121 + variant % 3 * 3;
      rect(11, ground, 158, 4, '#708258'); rect(16, ground + 4, 148, 11, '#3c5141');
      rect(25, ground + 15, 129, 6, '#293d32'); rect(36, ground + 21, 108, 5, '#203029');
      for (let i = 0; i < 18; i++) rect(18 + (i * 13 + variant * 7) % 143, ground - 1 - i % 2, 1, 2, '#b3bf86');
      if (variant % 2) {
        rect(127, 85, 3, 38, '#80735d'); rect(115, 82, 25, 13, '#507752'); rect(118, 73, 19, 14, '#62815a'); rect(124, 68, 8, 9, '#819469');
      } else {
        rect(24, 103, 26, 20, '#aeaa83'); rect(20, 100, 34, 3, '#7c7153'); rect(24, 96, 26, 4, '#7c7153'); rect(28, 91, 18, 5, '#7c7153'); rect(33, 108, 6, 15, '#4b6048');
      }
      rect(43, ground + 2, 16, 1, '#a4a675'); rect(112, ground + 2, 9, 1, '#a4a675');
    }
    spritePromise ??= Promise.all(SPRITES.map(loadSprite));
    spritePromise.then(sprites => {
      if (cancelled) return;
      function actor(species: number, frame: number, x: number, feet: number, height: number, alpha = 1) {
        if (theme === 'kingdom') {
          // Original illustrative pawns, not the separately licensed Tiny Swords sprites.
          const colors = ['#8daaba', '#cba979', '#9bad81', '#b59fb8'];
          const scale = Math.max(1, Math.round(height / 14));
          const hop = frame % 2;
          const top = Math.round(feet - 14 * scale - hop);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = colors[species]; ctx.fillRect(x - 4 * scale, top, 8 * scale, 5 * scale);
          ctx.fillStyle = '#d7c5a1'; ctx.fillRect(x - 3 * scale, top + 5 * scale, 6 * scale, 3 * scale);
          ctx.fillStyle = '#253338'; ctx.fillRect(x + scale, top + 6 * scale, scale, scale);
          ctx.fillStyle = colors[species]; ctx.fillRect(x - 3 * scale, top + 8 * scale, 6 * scale, 4 * scale);
          ctx.fillStyle = '#646c65'; ctx.fillRect(x - 3 * scale, top + 12 * scale, 2 * scale, 2 * scale); ctx.fillRect(x + scale, top + 12 * scale - hop, 2 * scale, 2 * scale);
          ctx.globalAlpha = 1;
          return;
        }
        const sprite = sprites[species];
        const width = Math.round(height * sprite.width / sprite.height);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite.image, frame * sprite.cell + sprite.x, sprite.row * sprite.cell + sprite.y, sprite.width, sprite.height, Math.round(x - width / 2), Math.round(feet - height), width, height);
        ctx.globalAlpha = 1;
      }
      function render(now: number) {
        if (cancelled) return;
        frameRequest = requestAnimationFrame(render);
        if (now - previous < 1000 / 12 || document.hidden) return;
        previous = now;
        const time = motion.matches ? 0 : now / 1000;
        const frame = resting || motion.matches ? 0 : Math.floor(time * 5) % 4;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 180, 180);
        ctx.drawImage(background, 0, 0);
        // Sparse fireflies make depth visible at low resolution without UI noise.
        for (let i = 0; i < 17; i++) {
          const x = (i * 31 + variant * 17) % 176 + 2;
          const y = 20 + (i * 19) % 112;
          ctx.globalAlpha = .14 + .18 * (1 + Math.sin(time * .7 + i));
          ctx.fillStyle = i % 3 === 0 ? '#cfc498' : '#718d79'; ctx.fillRect(x, y, 1, 1);
        }
        ctx.globalAlpha = 1;
        if (title) {
          actor(0, frame, 28, 81, 16);
          actor(1, needsHelp ? 0 : frame, 99, 80, 13);
          actor(3, frame, 126, 81, 10);
          actor(2, 0, 159, 104, 12, .65);
          // A pickaxe, sawdust and a build scaffold supply small purposeful jobs.
          ctx.fillStyle = '#99835f'; ctx.fillRect(35, frame % 2 ? 76 : 72, 1, 7);
          ctx.fillStyle = '#bec4ab'; ctx.fillRect(33, frame % 2 ? 74 : 70, 5, 1);
          if (!motion.matches) {
            ctx.fillStyle = '#b9a780';
            for (let i = 0; i < 4; i++) ctx.fillRect(36 + (frame * 2 + i * 3) % 8, 82 + (frame + i) % 7, 1, 1);
          }
          ctx.fillStyle = '#587666'; ctx.fillRect(155, 86, 3, 1); ctx.fillRect(157, 84, 3, 1); ctx.fillRect(159, 82, 3, 1);
        } else {
          actor(variant % 4, needsHelp ? 0 : frame, 87 + (motion.matches || needsHelp || resting ? 0 : Math.round(Math.sin(time * .6 + variant) * 8)), 122 + variant % 3 * 3, 26, resting ? .45 : 1);
          if (variant % 3 === 0) actor(3, frame, 136, 121, 10);
        }
        screen!.dataset.ready = 'true';
      }
      frameRequest = requestAnimationFrame(render);
    }).catch(error => console.error('Could not load Corral demo sprites', error));
    return () => { cancelled = true; cancelAnimationFrame(frameRequest); };
  }, [title, variant, needsHelp, resting, theme]);
  return <canvas ref={canvas} width="180" height="180" className="reveal-world-screen" role="img" data-theme={theme} aria-label={title ? `CORRAL built from grassy pixel letters, with ${theme === 'farm' ? 'farm characters' : 'illustrative pawns'} working and resting on them.` : `A ${theme} demo agent in its small island world.`} />;
}
