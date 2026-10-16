# Ramen / Cocina

`ramen` is a built-in native Stream Deck theme. Turn the last Agents strip dial until **RAMEN / COCINA** appears. It requires no downloaded art, optional Kingdom sprites, extra action, network service or configuration.

## One kitchen, two surfaces

The 120×120 keys and 800×100 touch strip share original procedural pixel-art chefs, toques, five identity-seeded apron palettes and kitchen props. A teal tiled wall, wooden counter, bowls, herbs, pendant lamps and checkerboard floor make the strip a kitchen rather than a recoloured farm. The strip has day, warm dusk and illuminated night backdrops using Corral's existing hour boundaries; keys remain consistently lit for legibility.

| Live herdr status | Kitchen depiction |
| --- | --- |
| `working` | Chef carries a handled stockpot with cycling steam. On the strip, the chef walks with the pot. |
| `blocked` | Chef consults an open, two-page recipe book. The key has **!**; the shared strip name tag also signals **!**. |
| `done` | Finished ceramic ramen bowl with golden noodles and green garnish; **✓** on the key and strip name tag. |
| `idle` | Utensils are stored in a terracotta crock; no steam or cooking. |
| `unknown` | Stored utensils plus an explicit **?**, not a completion or an invented task. |

Animations are decorative, not a progress model. A frame, poll sequence, title or elapsed time cannot change an agent's status. Working keys loop every four frames; all other key states are deliberately static, avoiding false urgency and unnecessary cache entries. The shared scene still walks newly visible chefs into their positions.

## Existing controls and presentation modes

- The theme uses `createScene(skin)` unchanged: movement, visible-agent placement, per-device `fork()`, taps and following captions stay in the common scene implementation.
- `identity` chooses the apron palette but is never drawn as text. Workspace/subtitle captions use the existing label helpers. Showcase aliases therefore change only the labels, not the chef.
- The chef starts below the top-left PIN badge. Key labels finish above the Showcase footer. Strip silhouettes and props end above y=89, leaving the shared camera footer clear.
- Focus borders, pinned/reserved keys, error handling, theme cycling and Showcase focus safety remain the existing native behavior. No web app files or scene engine fork are involved.

## Art provenance

All new art is authored in `apps/plugin/src/themes/ramen.ts` using `Canvas.pattern` and rectangles, under the repository's MIT license. There are no image downloads, extracted game sprites, third-party ramen packs or generated binary assets to distribute. See the native image directory's `CREDITS.md`.

## Verification

From the repository root with Bun 1.4.3:

```sh
bun install --frozen-lockfile
bun run --cwd apps/plugin test
bun run --cwd apps/plugin typecheck
bun run build:plugin
bun run validate
git diff --check
```

Focused real-renderer tests:

```sh
bun run --cwd apps/plugin test tests/ramen.test.ts
```

`ramen.test.ts` verifies registration without optional art, actual status-specific sprite pixels, identity variety, no timer-derived progression, opaque native dimensions, keyFrame/cache equivalence over multiple loops and large frames, all 24 hour backgrounds versus cold scenes, exact safe captions, PIN/Showcase composition, working movement and independent device touch targets. It renders actual canvases and decodes the real cached PNGs; it does not mock the theme or substitute placeholder sprite sheets.

Evidence generators and output images/videos belong outside the repository, in the runtime scratch directory. Synthetic fixture labels must be explicit; renderer evidence is not physical Stream Deck verification.
