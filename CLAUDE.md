# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

HarvestNote is an offline-first, gamified task/note app in Turkish: every note is a
seed planted in soil, it goes weedy if neglected, and completing it harvests it into
a pantry. UI strings, comments and commit-facing text are Turkish; identifiers are English.

## Commands

```bash
npm run typecheck                      # tsc --noEmit (strict + noUncheckedIndexedAccess)
npx expo start                         # Metro dev server
npx expo run:android                   # development build — REQUIRED to test notifications
npx expo export --platform android     # full Metro bundle; catches Babel/import errors tsc cannot
```

`expo export` is the cheapest real end-to-end check — it has caught a duplicate Babel
plugin and a stale `src/app/` directory that Metro mistook for an Expo Router root.
Run it after touching `babel.config.js`, `app.json`, or module layout.

There is **no test framework installed**. The pure modules (`src/game/growth.ts`,
`src/game/stages.ts`, `planReminders` in `src/notifications/weedReminders.ts`) are
deliberately free of DB and React imports so they can be exercised directly with
Node's built-in TypeScript stripping (`node file.ts`) after copying them somewhere with
explicit `.ts` import extensions. SQL is verifiable the same way against `node:sqlite`
by extracting the DDL string out of `src/db/schema.ts`. Use this before claiming
game-rule or SQL changes work.

## Architecture

Layering is strict and one-directional:

```
types → db (schema · repositories · mappers) → game (pure rules) → notifications
      → providers/hooks → screens/components
```

`src/db/index.ts` is the data layer's public entry; UI should not reach into
`database.ts` or `schema.ts` directly.

### No background service

Nothing runs while the app is closed. Elapsed time is simulated on open:
`bootstrap.ts` → `initDatabase()` → `runTimeSkip()` → field stats → reminder sync.
`FarmProvider` re-runs `runTimeSkip()` when the app returns from background, because
a mobile app can stay "open" for days and cold start alone would mean weeds never grow.

### Derived vs. persisted state

This distinction drives most of the design:

- **Persisted** (`notes.status`, CHECK-constrained): `planted | growing | weedy`.
- **Derived** (`resolveStage` in `src/game/stages.ts`): adds `harvestable`.
  "Ready to harvest" is a function of time — persisting it would force time-skip to
  write on every launch. The UI reads stages, never raw `status`, and gets live
  behaviour without schema churn. Adding a fourth status to the DB would be a
  regression, not a fix.
- Reminders are derived too: the scheduled-notification set is a function of the DB,
  recomputed on every change rather than tracked in a column.

### Time semantics

- All timestamps are **epoch ms INTEGER**, never ISO strings.
- `created_at` drives growth/maturity. `last_tended_at` drives weeds and reminders.
  Keeping them separate is load-bearing: a note the user just weeded or edited must
  not immediately go weedy again.
- Harvest **never deletes** a note — it stamps `harvested_at` and inserts into
  `inventory`, both in one transaction. The field is `harvested_at IS NULL`.

### The `revision` funnel

`FarmProvider` exposes `revision` plus **two** notify channels. Every mutation goes
through `useNotes`/`useInventory` and picks one:

- `notifyScheduleChanged()` — the write moves some note's weed clock. Bumps
  `revision` *and* asks for a reminder sync. All five `useNotes` mutations use it:
  planting creates a reminder, harvest/delete invalidate one, and tend/edit both
  refresh `last_tended_at` (see `updateNote`), which slides the reminder forward.
- `notifyContentChanged()` — the write cannot move any reminder. Bumps `revision`
  only; the notification layer is never touched. Today that is just discarding a
  pantry item.

**Put cross-cutting reactions here, not in individual mutations** — that is what
makes "harvested but its reminder is still scheduled" unrepresentable. When unsure
which channel to use, pick `notifyScheduleChanged()`: a redundant sync is cheap
(it is debounced), a missed one is a stale notification.

### Weed reminders

Local notification fires `WEED_REMINDER_LEAD_MS` (6h) before a note goes weedy.
The note↔notification link is a deterministic identifier (`weed-<id>`), which is why
no `reminder_id` column or migration was needed; re-scheduling the same identifier
replaces the previous request, so sync is idempotent. Permission is requested lazily —
only when there is at least one reminder to schedule, i.e. after the first seed.
Notification failures are swallowed by design; the app must work without them.

`syncWeedReminders()` re-reads and re-schedules *everything*, so it is never called
per write. Callers use `requestReminderSync()`, which debounces by 1.5s and serializes
runs — two overlapping syncs would each start from `getAllScheduledNotificationsAsync`
and one could cancel what the other just scheduled. `FarmProvider` calls
`flushReminderSync()` when the app leaves the foreground, because JS timers can be
suspended there and that is exactly the moment the OS-scheduled set must be correct.

## Invariants and traps

- **Migrations are append-only.** `MIGRATIONS` in `src/db/schema.ts` is driven by
  `PRAGMA user_version`. Never edit a shipped entry; add a new one. Users' data is the
  only copy — no drop-and-recreate.
- **Inside `withExclusiveTransactionAsync`, use the `txn` handle**, never the module
  `db`. Writing through `db` waits on the lock the transaction already holds and
  deadlocks. Repository writes that can run inside a transaction take an optional
  `executor` parameter for exactly this (`setNoteStatuses`, `setLastOpenedAt`).
- **Do not add the Reanimated/worklets Babel plugin manually.** `babel-preset-expo`
  adds `react-native-worklets/plugin` automatically when the package is installed;
  adding it again is a duplicate-plugin build error (Reanimated 4 / SDK 57).
- **`StyleSheet.absoluteFillObject` does not exist in RN 0.86.** Use
  `...StyleSheet.absoluteFill` (now a plain object).
- **Never create `src/app/`** — Metro resolves it as an Expo Router root.
- `noUncheckedIndexedAccess` is on: array indexing yields `T | undefined`.
- Percentage widths from template literals do not satisfy `DimensionValue`; use flex
  ratios (see the maturity bar in `NoteCard`).
- `devAgeNotes` and the Farm screen's "Zaman makinesi" button are `__DEV__`-only and
  exist because real thresholds (4h growth, 48h weeds) make stages untestable by hand.

## Gesture contract (`src/components/NoteCard.tsx`)

Per derived stage:

| stage | gesture | effect |
| --- | --- | --- |
| `weedy` | horizontal swipe | weeds slide off → `tendNote` |
| `weedy` | tap | **refuses to open** — shake + hint toast |
| `harvestable` | swipe up / long press | pop, scale to 0 → harvest |
| any non-weedy | tap | detail sheet |

The refusal on weedy taps is a product rule, not an oversight — the note is
unreachable until the user clears it.

## UI conventions

- No extra UI libraries. Bottom sheets, buttons and icons are RN primitives,
  `StyleSheet` and emoji; palette and scales live in `src/theme/index.ts`.
- Gesture handlers inside an RN `Modal` need their own `GestureHandlerRootView`
  (see `BottomSheet.tsx`) or they silently do nothing on Android.
- One clock per screen: `useNow()` ticks and is passed down as a prop, rather than
  each card owning a timer.
