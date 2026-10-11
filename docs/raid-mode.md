# Raid Mode

## Setup and controls

Raid ships with original MIT-licensed `Canvas.pattern` art: the Crystal Warden, party adventurers and victory trophy.
No external art download is needed. Build/install normally, turn dial 4 to **RAID**, and drag **Raid Round** from the
Corral category onto a spare key (for example, top-left with seven Agent slots).

- **Raid Round key:** start a round, or immediately reset an active/finished round. Refreshes herdr first and awaits
  an in-flight poll if one exists. Green confirmation means the round started; alert means offline or no agents.
- **Agent slot key:** still focuses its agent. It never resets a raid.
- **Strip tap / dial push:** still focus the tapped / most urgent agent. Blocked party members ask for help with `!`
  and the strip's help count. No combat gesture replaces focus.
- **Dial 4 rotation:** switches themes as before. Raid progress is kept while another theme is selected.

The control key displays boss health or victory even if the selected theme isn't Raid. The strip is the selected
theme; choose Raid to see the party arena. All round data is in memory: plugin restart returns to **RAID READY**.

## Exact round rules

1. There is **no automatic first round or next round**. Press Raid Round explicitly.
2. Every unique `paneId` in the successful start snapshot is enrolled, including idle, unknown, blocked and done
   agents, across **all pages**, not just visible keys. Boss maximum HP is that number; each participant can deal
   exactly one point of damage. Labels and visual identities may change without changing enrollment.
3. Only two consecutive successful observations with that pane's status **working → done** land its hit. The start
   snapshot is the baseline, not a completion. Initial done, repeated done polls, `blocked → done`, idle/unknown →
   done and further completions by an agent that already hit do not reduce HP.
4. Blocked agents request human help; helping/focusing them does not itself deal damage. After help, the agent must
   be observed working, then done. Changes occurring entirely between one-second polls are not inferred.
5. New panes wait until the next explicit reset. They still appear and can be focused; their key says **NEXT ROUND**.
6. A disappeared participant stays enrolled and its unearned hit stays required. The strip reports missing pending
   participants. Returning in done state does not get a hit across the gap; returning working, then done can hit.
   Either wait for its return or reset to the current roster. Already-earned hits remain earned after disappearance.
7. A successful empty roster does not win, shrink, or reset a round. It reports missing pending participants, and
   starting/resetting with no agents is refused without changing the round.
8. Failed polls freeze HP/enrollment, mark the raid paused, and break transition continuity. A returning done snapshot
   cannot reward unseen offline work. Reset while offline is refused, including when a stale roster is retained.
9. At zero HP the boss becomes a trophy with sparkles. Victory persists until explicitly reset. A reset clears all
   hits, enrolls the current roster and establishes a new baseline; even agents currently done must work then finish.

**HIT PENDING** / **HIT LANDED** on keys refer to the raid contribution, not a claim about task status. A done agent
whose completion predates the round can show done sparkles while its raid hit is still pending.

## Development

```sh
bun test
bun run typecheck
bun run build
```

Tests use `node:test`/`node:assert`, the real PNG renderer, and a clearly synthetic herdr CLI fixture through the real
subprocess adapter. They cover initial/repeated done, one hit per pane, blocked help, offline gaps, disappearance,
late enrollment, empty rosters, reset, polling/reset concurrency, control feedback and native manifest registration.
No physical Stream Deck is required to run these tests; hardware interaction still needs an on-device smoke test.
