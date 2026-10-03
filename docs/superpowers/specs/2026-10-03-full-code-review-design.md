# Full Project Code Review — Design Spec

**Status:** Approved
**Date:** 2026-10-03

## Objective / why

ClyTrade is ~14.3k LOC of AI-generated TypeScript/React plus a Rust/Android
native shell, build scripts and CI, guarded by 51 test files and the conventions
in AGENTS.md. The owner wants a single rigorous, whole-repo review that surfaces
correctness, security, architecture, performance, accessibility, i18n and test
gaps; records them in one severity-ranked report; and produces a concrete fix
plan. This is an audit program: it changes no product behavior by itself.

## Success criteria / definition of done

1. `docs/reviews/<date>-code-review.md` exists, committed, using the structure in D11.
2. Every in-scope area is covered and the report states coverage and explicit gaps.
3. Every finding has id, severity (Critical/High/Medium/Low/Nit), area,
   `file:line` evidence, impact, and the smallest suggested fix.
4. The security-audit full workflow (standard profile) reaches one of its two
   terminal states; confirmed findings are folded into the report on the unified
   severity scale.
5. Baseline `npm run typecheck`, `npm run lint`, `npm test` are run and their
   results recorded in the report.
6. The review modifies no source files; `src/calculations/**` is untouched.
7. A Plan 2 (fixes) covering all confirmed findings is written and approved.
8. Deferred/accepted Low/Nit items are appended to `TODO.md`.
9. `AGENTS.md` references `docs/reviews/`.
10. Spec and Plan 1 are committed; no target-project code is committed by planning.

## Scope

### In scope

- App source: `src/app`, `src/features`, `src/calculations` (read-only),
  `src/data`, `src/ui`, `src/theme`, `src/i18n`, `src/lib`, `src/navigation`,
  `src/test`, `src/docs`.
- Tooling: `scripts/*.mjs`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`.
- Native: `src-tauri/` (Rust entry, `tauri.conf.json`, capabilities, committed
  Android project, proguard rules, `.github` native build steps).
- CI: `.github/workflows/release.yml`, `.github/workflows/pages.yml`.
- Prose: `README.md`, `masterplan.md`, `AGENTS.md`, `CHANGELOG.md`,
  `CONTRIBUTING.md`, `TODO.md`, `src/docs/**` for accuracy vs. behavior.
- Dimensions: correctness, security/data-safety, architecture/conventions,
  performance, a11y/UX, i18n/RTL, tests.

### Non-goals (explicitly out)

- No feature work or intentional product behavior change.
- No fixes during the review (that is Plan 2).
- No new dependencies (including no coverage tooling).
- Never modify `src/calculations/**`.
- No CodeRabbit CLI (not installed).
- No server/port changes; review runs read-only against HEAD.
- Never hand-edit generated files; any recommendation routes through generators.

## Decision log

| #   | Decision                                                                                                                                                                                            | Rationale                                           | Status  | Source         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------- | -------------- |
| D1  | Deliverable = severity-ranked findings report + fix plan, as two documents                                                                                                                          | Findings can't be enumerated before the review runs | decided | user           |
| D2  | Scope = all areas: `src/**` (app, features, calculations, data, ui, theme, i18n, docs, lib, navigation, test), `scripts/`, `src-tauri/` (Rust + Android + config), `.github/workflows/`, docs/prose | Owner wants the whole project covered               | decided | user           |
| D3  | Dimensions = correctness/bugs (priority), security/data-safety, architecture/conventions, performance, a11y/UX, i18n/RTL, tests/coverage                                                            | All standard dimensions requested                   | decided | user           |
| D4  | Method = manual expert read + `typecheck`/`lint`/`test`; security-audit skill full mode; CodeRabbit skipped                                                                                         | CLI not installed; avoid external API               | decided | user           |
| D5  | Constraints = `src/calculations/**` strictly read-only; no silent behavior/API changes; generated files only via npm scripts; rest of tree fair game for recommended fixes                          | AGENTS.md hard rule + owner intent                  | decided | user           |
| D6  | Report = committed `docs/reviews/<date>-code-review.md`                                                                                                                                             | Requested separate report                           | decided | user           |
| D7  | Fix plan covers all confirmed findings, severity-ordered                                                                                                                                            | Owner wants completeness                            | decided | user           |
| D8  | Severity = unified Critical / High / Medium / Low / Nit                                                                                                                                             | One scale for bugs and security                     | decided | user           |
| D9  | Review broken into one task per repo area                                                                                                                                                           | Per-area passes chosen                              | decided | user           |
| D10 | Security = full six-phase audit, standard profile, cap ~30 agent invocations, artifacts in `~/security-audit-skill/clytrade/run-N`; summary folded into report                                      | Explicit full audit requested                       | decided | user           |
| D11 | Report structure = exec summary → severity table → per-area detail → security summary → coverage statement + gaps                                                                                   | Full structured report                              | decided | user           |
| D12 | Two plans: Plan 1 review+report; Plan 2 fixes after findings                                                                                                                                        | Findings unknown now; two gates                     | decided | user           |
| D13 | Fixes follow house TDD, one commit each, run `typecheck`/`lint`/`test`                                                                                                                              | Matches repo history                                | decided | user           |
| D14 | Tests dimension assessed manually over the 51 test files; no coverage dependency                                                                                                                    | Keep deps unchanged                                 | decided | user           |
| D15 | Parallel exploration subagents per area; parent owns synthesis and report                                                                                                                           | Speed with consistency                              | decided | user           |
| D16 | Ordering: security audit → per-area review → synthesis                                                                                                                                              | Security view informs correctness pass              | decided | user           |
| D17 | Unfixed/accepted Low/Nit findings appended to `TODO.md`                                                                                                                                             | Don't lose items                                    | decided | user           |
| D18 | Add a pointer to `docs/reviews/` in `AGENTS.md`                                                                                                                                                     | Future agents find reports                          | decided | user           |
| D19 | Review targets current `master` HEAD (`15e30c0`), clean worktree; report dated at run time                                                                                                          | Reproducibility                                     | assumed | recommendation |
| D20 | Report filename `2026-10-03-code-review.md` (run date may adjust the date prefix)                                                                                                                   | Consistent with `docs/superpowers` date convention  | assumed | recommendation |

## Architecture / method

Phase A — Security audit (first). Run the security-audit skill in full audit
mode, standard profile, budget cap ~30 agent invocations. Output dir
`~/security-audit-skill/clytrade/run-<N>`. Terminal state recorded. Confirmed
findings summarized into the report.

Phase B — Per-area review (parallel). One pass per area (D2), each cross-cutting
all dimensions (D3). Area passes run as parallel exploration subagents; the
parent owns cross-cutting synthesis. Baseline checks (`typecheck`, `lint`,
`test`) run once and recorded.

Phase C — Synthesis. Merge Phase A and B into the report (D11): executive
summary → severity-ranked findings table → per-area detail → security summary →
coverage statement + explicit gaps. Deduplicate overlapping findings.

Phase D — Housekeeping. Append deferred/accepted Low/Nit items to `TODO.md`; add
the `docs/reviews/` pointer to `AGENTS.md`.

Phase E — Plan 2. Once the report is approved, write the implementation plan for
all confirmed findings (D7, D13).

## Risks + rollback

- **Scope/time**: 14k LOC across many areas is multi-session. Mitigate with
  per-area tasks and a coverage statement that names any unreviewed area.
- **Security budget overrun**: cap at ~30 invocations; if exhausted, the skill
  records `run_status: incomplete` and gaps are disclosed.
- **False positives**: every finding requires `file:line` evidence; the parent
  independently verifies before the report.
- **Report/JSON disagreement** (security phase): rely on the skill's validators;
  fold only validated confirmed records.
- **Rollback**: review is read-only except `docs/reviews/*`, `TODO.md`,
  `AGENTS.md`; revert those commits if needed. No product code touched.

## Dependencies / ordering

Security audit first (D16) → per-area passes → synthesis → TODO/AGENTS updates →
Plan 2. Plan 1 (review) must be approved before execution; Plan 2 requires the
report to exist first.

## Open questions

None.
