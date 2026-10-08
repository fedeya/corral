# Adding a theme

A theme is one file in `src/themes/` plus one line to register it. Corral already handles the herdr data, sorting,
paging, taps, dials, name tags, theme switching and caching. A theme only decides how things look.

## Quick start

1. **Copy the template.**

   ```sh
   cp src/themes/_template.ts src/themes/robots.ts
   ```

   The template is a complete, working theme: a pixel slime drawn in code, so no image files are needed. Every part is
   commented. Rename the exported constant, and change `id` and `name` (`name` is what flashes on the touch strip when
   you switch to it).

2. **Register it.** Import it in `src/themes/index.ts` and add it to `THEMES`. The last dial now cycles through it.

3. **Preview it without a Stream Deck.**

   ```sh
   bun run preview robots --open
   ```

   This renders the keys and the touch strip by day and by night to a PNG. It uses your live herdr agents, or sample
   ones if herdr isn't running. It also works for themes you haven't registered yet.

4. **Try it on the device.**

   ```sh
   bun run typecheck && bun run build && bun run restart
   ```

5. **Add it to the README.** Run `bun run media` to render `docs/media/<id>.gif`.

## What a theme provides

```ts
export const robots: Theme = {
  id: "robots",
  name: "ROBOTS",
  drawKey,      // (agent, frame) => Canvas
  keyFrame,     // (agent, frame) => number
  prepare,      // optional: (agents) => boolean
  scene: createScene(skin),
};
```

### Keys

**`drawKey(agent, frame)`** returns a 120×120 `Canvas` for one agent. Draw something different for each
`agent.status`:

| Status | Meaning |
|---|---|
| `working` | The agent is busy |
| `blocked` | It needs you |
| `done` | It finished |
| `idle` / `unknown` | Nothing going on |

`frame` ticks 8 times a second.

**`keyFrame(agent, frame)`** returns the animation step. Keys that return the same step render the same image, which
gets drawn once and cached. Return `frame % loopLength` for each status.

### Touch strip

**`scene`** is built with `createScene(skin)`. The shared scene code (`src/scene.ts`) already:

- places each visible agent under its key;
- walks new figures in from the edge, and moves working ones back and forth;
- draws name tags that follow their figure and never overlap;
- figures out which agent a tap landed on.

The skin only paints:

| Skin method | Purpose |
|---|---|
| `background(hour, frame)` | The 800×100 backdrop. It's cached by the `key` it returns, so return a different key per look, e.g. per time of day. |
| `overlay(c, hour, frame)` | Optional animated details behind the figures: clouds, water, grazing sheep. |
| `drawActor(c, actor, frame)` | Draws one figure and returns the y of the top of its head, where the name tag's pin ends. |

The `actor` passed to `drawActor` has:

- `agent`;
- `x` and `feet`, where to draw;
- `dir`, `1` facing right or `-1` facing left;
- `arrived`, which is `false` while the figure is still walking in;
- `seed`, a stable random number per agent.

The strip animates 4 times a second.

### Per-workspace variety (optional)

**`prepare(agents)`** sees the full agent list after each poll. Return `true` when key images need redrawing. Kingdom
uses it to deal jobs and team colours evenly across all workspaces.

For a simple stable choice, use `` pick(`mytheme:${agent.workspace}`, options) `` from `src/scene.ts`.

## Toolbox

| Helper | Where | What it does |
|---|---|---|
| `Canvas` | `src/pixel.ts` | `rect`, `pattern` (ASCII art), `set` and `crop` |
| `Canvas.blitScaled` | `src/pixel.ts` | Draws a sprite-sheet frame at any scale (also below 1), with `flip`, `tint` and `alpha` |
| `loadSheet` / `hasImage` | `src/pixel.ts` | Loads and checks images in `dev.fedeya.corral.sdPlugin/imgs/` |
| `drawBubble` + `BANG` / `CHECK` | `src/render.ts` | The "!" and "✓" speech bubbles |
| `sparkles` | `src/render.ts` | Blinking sparkles for done states |
| `label` | `src/render.ts` | The workspace name in a key's bottom band |
| `frameBorder` | `src/render.ts` | Key borders, including the white one for the focused agent |
| `P`, `THEME`, `shade`, `isIdle` | `src/render.ts` | PICO-8 palette, per-status colours, colour helpers |
| `period(hour)` | `src/scene.ts` | `"day"`, `"dusk"` or `"night"` |

## Conventions

These keep themes consistent with each other:

- Put the art in the top ~75px and the workspace name in the bottom band, using `label`.
- Use the status colour from `THEME` for the background or the bottom band.
- Dim idle agents so they don't compete with the ones that need you.
- Draw a white border around the focused agent.
- Animate every status, not just working.
- Keep the same character for a workspace on the key and on the strip.

## Art and licenses

- Put sprite sheets in `dev.fedeya.corral.sdPlugin/imgs/<id>/` and load them with `loadSheet("<id>/file.png")`.
- Credit the artist in `dev.fedeya.corral.sdPlugin/imgs/CREDITS.md`.
- CC0 and CC-BY art can be committed.
- If the license forbids redistribution, as with Tiny Swords:
  - git-ignore the folder;
  - register the theme only when the art is present (see how `index.ts` uses `hasImage` for kingdom);
  - explain in the README where to download the art.

Good places to look for art: [OpenGameArt](https://opengameart.org), [Kenney](https://kenney.nl/assets) (all CC0) and
free packs on [itch.io](https://itch.io/game-assets/free/tag-pixel-art).
