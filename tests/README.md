# Tests

Unit tests for the pure-function library under `src/lib/`. Run from repo root:

```
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # v8 coverage report → coverage/
```

## What's covered

- `duration.ts` — every accepted text and colon form, plus NaN edge cases.
- `excelDate.ts` — serial → wall-clock formatting, UTC vs local `Date`
  formatters, and the "looks like a serial" gate.
- `underestimated.ts` — `parseKm` unit conversion (km / m / commas / bare
  numbers) and the "long duration but short distance" rule predicate.
- `driverLookup.ts` — VID normalisation and both lookups
  (`buildDriverLookup`, `buildDriverProfileLookup`).
- `fuseSearch.ts` — `tokensMatch` N-1 tolerance, single-char token drop, and
  the empty-tokens fallback branch. Also sanity-checks `buildFuse`.
- `transporterScope.ts` — non-scoped passthrough, block filtering, empty-file
  dropping, immutability.
- `nightsMerger.ts` — Ethiopian 18:00→06:00 bucketing (`nightBucketKey`),
  row-validity gate, and the two-row same-shift merge (times, positions,
  summed durations, `mergedCount`).
- `locationRules.ts` — coord-line parsing (including `&deg;` entity), rule-tag
  extraction, event-date parsing, and both matcher builders (VID and location
  tag) with date-scope semantics.
- `utils.ts` — `cn`, `initials`, `truncate`, `newId` shape/uniqueness, and
  the parse-guard behaviour of `formatDate` / `formatDateTime`.

## Not touching the app

Tests live under `tests/` at repo root, outside `src/`. `tsconfig.app.json`
only compiles `src/`, so the app bundle is unaffected. Vitest reads
`vitest.config.ts` (separate from `vite.config.ts`) and imports the source
files as ordinary ES modules — no framework, no mocks, no side effects.
