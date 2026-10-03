# Full Project Code Review — Review Execution — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-03-full-code-review-design.md`
**Status:** Draft (awaiting approval)
**Date:** 2026-10-03

## Global constraints (from the spec)

- **Read-only review.** The review modifies no source files; `src/calculations/**`
  is never modified. The only repo writes are `docs/reviews/*`, `TODO.md` and the
  `AGENTS.md` pointer.
- **No new dependencies** (including no coverage tooling). No feature work, no
  product behavior changes, no server/port changes.
- **Never hand-edit generated files**; any recommendation routes through
  `npm run icons` / `npm run accents` / `npm run icons:native`.
- Severity scale is unified **Critical / High / Medium / Low / Nit** (D8).
- Every finding carries id, severity, area, `file:line` evidence, impact and the
  smallest suggested fix (success criterion 3).
- CodeRabbit CLI is not used (D4).
- `src/calculations/**` is reviewed for correctness but flagged, not fixed.
- Run Node via nvm:
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` before npm/test commands.

## Finding record schema (used by every pass)

Every area pass returns an array of records in this shape; the parent merges and
de-duplicates them in Task 3.

```ts
type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Nit'
type Dimension =
  | 'correctness'
  | 'security'
  | 'architecture'
  | 'performance'
  | 'a11y'
  | 'i18n'
  | 'tests'

interface Finding {
  id: string // assigned in Task 3, e.g. CR-001
  severity: Severity
  dimension: Dimension
  area: string // e.g. 'src/data'
  title: string
  evidence: { file: string; line: number; excerpt: string }[]
  impact: string
  suggestedFix: string
  confidence: 'high' | 'medium' | 'low'
}
```

Passes must cite real `file:line` locations. A finding without at least one
resolvable citation is dropped in Task 3.

## Deliverable map

```
docs/superpowers/specs/2026-10-03-full-code-review-design.md  (done)
docs/reviews/2026-10-03-code-review.md                        (Task 3, create)
TODO.md                                                       (Task 4, modify)
AGENTS.md                                                     (Task 4, modify)
~/security-audit-skill/clytrade/run-<N>/                      (Task 2, external)
/tmp/clytrade-review-baseline/                                (Task 1, scratch)
```

## Tasks

### Task 1 — Baseline and preparation

**Files:** none modified. Writes scratch logs to `/tmp/clytrade-review-baseline/`.

Record the reviewed source ref and worktree state, then capture the baseline
checks the report must contain:

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
mkdir -p /tmp/clytrade-review-baseline
git rev-parse HEAD > /tmp/clytrade-review-baseline/head.txt
git status --porcelain > /tmp/clytrade-review-baseline/status.txt
npm run typecheck > /tmp/clytrade-review-baseline/typecheck.txt 2>&1; echo $? > /tmp/clytrade-review-baseline/typecheck.code
npm run lint      > /tmp/clytrade-review-baseline/lint.txt      2>&1; echo $? > /tmp/clytrade-review-baseline/lint.code
npm test          > /tmp/clytrade-review-baseline/test.txt      2>&1; echo $? > /tmp/clytrade-review-baseline/test.code
```

Determine the next free security run directory under
`~/security-audit-skill/clytrade/` (lowest unused `run-<N>`).

**Interfaces produced:** `head.txt` (source ref for D19), baseline exit codes and
logs, the chosen security `run-<N>` path.

**Verification:** all six files exist; `head.txt` matches `git rev-parse HEAD`;
exit-code files contain `0` or a real non-zero code (non-zero codes are recorded
as review findings, not blockers).

**Commit:** none (scratch only).

---

### Task 2 — Phase A: security audit (full audit mode, standard profile)

**Files:** none in-repo. Writes to `~/security-audit-skill/clytrade/run-<N>/`
(external, per the security-audit skill's write isolation).

Invoke the `security-audit` skill in **full audit mode**, **standard profile**,
budget cap **~30 agent invocations**, targeting the repo root at the Task 1
source ref. Follow the skill's six phases in order and its sandbox rules; no
target code is executed outside its sandbox and no live/external endpoint is
probed (the app is local-first and has no server).

**Interfaces produced:** `run-metadata.json`, `coverage-ledger.json`,
`findings.json`, `REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`, and a
terminal state (`validators pass` or `run_status: incomplete` with a reason).

**Verification:** the run reaches exactly one documented terminal state; both
`validate-findings.cjs` and `validate-coverage-ledger.cjs` pass, or the report
opens with the incomplete status and its exact reason. Record the confirmed
finding count and the mapping from the skill's critical/high/medium/low to the
unified scale (high→High, medium→Medium, low→Low, informational→Nit).

**Commit:** none (artifacts live outside the repo; the summary is committed with
the report in Task 3).

---

### Task 3 — Phase B: per-area review passes (parallel)

**Files:** none modified. Each pass reads its area and returns `Finding[]`.

Run the area passes as parallel exploration subagents. Each pass reads every
listed file/section and evaluates **all** dimensions (correctness first, then
security, architecture, performance, a11y, i18n, tests). The parent runs the
passes, then independently re-resolves every citation before accepting a finding.

Area pass map (exact paths):

| # | Area | Paths |
| --- | --- | --- |
| B1 | App shell + navigation | `src/app/**`, `src/navigation/**` |
| B2 | Journal feature | `src/features/journal/**` |
| B3 | Portfolio feature | `src/features/portfolio/**` |
| B4 | Calculations feature | `src/features/calculations/**` |
| B5 | Settings feature | `src/features/settings/**` |
| B6 | Filters feature | `src/features/filters/**` |
| B7 | Calculations core (**read-only**) | `src/calculations/**` |
| B8 | Data layer | `src/data/**` |
| B9 | UI design system | `src/ui/**` |
| B10 | Theme + styles | `src/theme/**`, `src/styles/**` |
| B11 | i18n | `src/i18n/**` |
| B12 | Library + test setup | `src/lib/**`, `src/test/**` |
| B13 | Backend/manifest/tooling | `scripts/**`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js` |
| B14 | Native shell | `src-tauri/**` |
| B15 | CI workflows | `.github/workflows/**` |
| B16 | Docs + prose | `README.md`, `masterplan.md`, `AGENTS.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `TODO.md`, `src/docs/**` |

Per-area focus notes:

- **B7 (calculations):** correctness, edge cases, `null` on invalid input, no
  impurity imports. Findings only; never modify.
- **B8 (data):** backup/import validation, zod model gaps, schema-version
  handling, the known `updateTrade`/`updateAsset` partial-patch and
  Dexie v2 `defaultMarket` backfill items in `TODO.md`.
- **B11 (i18n):** key parity between `en.ts` and `fa.ts`, digit/date/RTL rules
  from `src/docs/en/general/language.md`.
- **B14 (native):** `.github` signing, `proguard` keep rules, the
  `ClyTradeNative` JS bridge, committed `gen/android/` customizations.
- **B15 (CI):** action pinning/major-version drift noted in `TODO.md`, workflow
  permissions, the `v*` tag → release/pages path.

**Interfaces produced:** `Finding[]` per area, each citing real `file:line`.

**Verification:** every pass returns a list (possibly empty) plus a coverage
note listing files read; the parent confirms each citation resolves with
`read`/`grep` and drops unresolvable ones; the union of areas equals the scope in
the spec with no uncovered area.

**Commit:** none (findings carried into Task 4).

---

### Task 4 — Phase C: synthesize and write the review report

**Files created:** `docs/reviews/2026-10-03-code-review.md` (run date prefix if
the run lands on a later date).

Merge Task 2 (security) and Task 3 (areas) findings; de-duplicate by root cause,
assign sequential ids (`CR-001`…), order by severity, and write the report with
this structure (spec D11):

1. Header: source ref, date, baseline check results, method summary.
2. Executive summary: counts by severity, top risks, overall health.
3. Severity-ranked findings table: id, severity, area, dimension, title.
4. Per-area detail: id, evidence (`file:line`), impact, smallest suggested fix.
5. Security summary: folded confirmed findings and the external artifact path /
   terminal state.
6. Coverage statement: areas covered, pass counts, and **explicit gaps** (any
   unreviewed area, incomplete security run, skipped dimension).

**Interfaces produced:** the committed report; a machine-readable list of
findings reused by Plan 2.

**Verification:**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
npx prettier --check docs/reviews/2026-10-03-code-review.md
git status --porcelain   # must show only docs/reviews/... (no source changes)
```

Expected: prettier passes; `git status --porcelain` lists only the report (plus
possibly `TODO.md`/`AGENTS.md` if Task 5 is bundled, otherwise nothing else). A
non-empty diff under `src/` fails the task.

**Commit:** `docs: add full project code review report`

---

### Task 5 — Phase D: follow-ups and reviews pointer

**Files modified:** `TODO.md`, `AGENTS.md`.

Append the deferred/accepted **Low/Nit** findings (those the owner chooses not to
fix in Plan 2) to `TODO.md` in its existing bullet style. Add one sentence to
`AGENTS.md` pointing to `docs/reviews/` as the home for review reports.

**Interfaces produced:** updated TODO entries; AGENTS pointer.

**Verification:**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
npx prettier --check TODO.md AGENTS.md
```

Expected: prettier passes; the new TODO bullets correspond one-to-one with the
deferred findings.

**Commit:** `docs: record code review follow-ups and reviews pointer`

---

### Task 6 — Phase E: Plan 2 (fixes) — separate approval gate

**Files created:** `docs/superpowers/plans/<date>-code-review-fixes.md`.

After the report is approved, write the fix plan covering **all confirmed
findings** (D7) in severity order, each as a commit-sized task following house
TDD style (D13): failing test first, one commit, run `typecheck`/`lint`/`test`.
`src/calculations/**` fixes require explicit owner permission before they are
planned. This task ends at gate #2 for Plan 2; no code is written here.

**Verification:** the fix plan exists, every confirmed finding id in the report
maps to a fix task or an explicit deferred note, and the plan links the report.

**Commit:** `docs: add code review fix plan`

## Dependencies / ordering

Task 1 → Task 2 (security first, D16) → Task 3 (per-area passes) → Task 4
(synthesis + report) → Task 5 (follow-ups) → Task 6 (Plan 2, gated separately).
Task 3's passes B1–B16 are independent of each other and may run concurrently.

## Risks + rollback

- **Budget overrun in Task 2:** the ~30-invocation cap is enforced by the skill;
  an exhausted budget yields `run_status: incomplete` with a disclosed gap.
- **False positives in Task 3:** mitigated by requiring resolvable `file:line`
  citations and parent re-validation before the report.
- **Coverage inflation:** the coverage statement names gaps; an unreviewed area is
  never reported as clean.
- **Accidental writes:** Task 4's `git status --porcelain` check fails the task if
  any `src/` file changed.
- **Rollback:** revert the review commits (`docs/reviews/*`, `TODO.md`,
  `AGENTS.md`); the external security artifacts can be deleted independently. No
  product code is involved.

## Open questions

None.
