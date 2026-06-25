# Upgrade Plan — From Cluttered Dashboard to Question-Driven UX

## Goal

Re-imagine the app from a **5-tab, 24-chart dashboard that renders everything at once** into a
**minimal, question-driven website**:

1. A clean landing/setup step asks the user about their GitHub repo and fetches the data.
2. The user is then shown a **list of questions** ("What do you want to know?").
3. Picking a question renders **only the one chart (or small set) that answers it** — no tabs,
   no wall of graphs.

This document is the phase-by-phase implementation plan. The question list is **derived from the
existing charts** (see the Question Catalog below).

---

## Current State (baseline)

- **Entry flow** (`src/App.tsx` + `RepoConfiguration`): a form collects `repoOwner`, `repository`,
  `project` (Project ID), `githubToken`, optional `openaiApiKey`, `plannedEffortForProject`,
  `plannedEndDate`, and the project-key mapping. Config is persisted to `localStorage`.
- **Dashboard** (`src/components/ui/ProjectDashboard/ProjectDashboard.tsx`): a single `Render`
  button fetches tasks (`projectFetcher`) + PRs (`prFetcher`), stores them in RxDB, then renders
  **5 tabs** — Project Overview, Team Analysis, Pull Requests, Issue Graph, Insights — each
  packed with charts. Everything mounts and computes at once.
- **24 chart/visualization components** in `src/components/ui/ECharts/` + the D3 `IssueGraph`.
- Two filtering systems coexist (legacy in-memory `useFilterableDimensions`; newer RxDB
  `useRxDBFilters*`). Charts persist their own filter/dimension selections to `localStorage`.

### Problems to solve
- Cognitive overload: all charts render simultaneously across tabs.
- Performance: every chart subscribes + computes even if the user only cares about one metric.
- Discoverability: a PM has to know which tab hides the answer to "are we on track?".
- Config and rendering are visually entangled (config box sits above the tabs permanently).

---

## Target Experience (the new flow)

```
┌── Step 1: Setup ──────────────┐   ┌── Step 2: Fetching ─────┐   ┌── Step 3: Ask ──────────────┐
│ "Tell us about your repo"     │   │  progress bar           │   │  "What do you want to know?" │
│  owner / repo / token …       │ → │  tasks + PRs → RxDB     │ → │  searchable question list     │
│  [Connect]                    │   │                         │   │  grouped by theme             │
└───────────────────────────────┘   └─────────────────────────┘   └───────────────┬──────────────┘
                                                                                    │ pick one
                                                                                    ▼
                                                                  ┌── Step 4: Answer ───────────────┐
                                                                  │  ONE chart for the question      │
                                                                  │  short plain-language takeaway   │
                                                                  │  optional inline filters         │
                                                                  │  [← Back to questions]           │
                                                                  └──────────────────────────────────┘
```

Key principles:
- **One question → one answer view.** Only the relevant chart(s) mount.
- **Progressive disclosure.** Setup is a step you leave behind, not a permanent panel.
- **Derived questions, stable charts.** We reuse existing chart components; we add a thin
  question-routing layer on top. No chart logic is rewritten in early phases.

---

## Question Catalog (derived from existing charts)

Each question maps to one (occasionally two) existing component(s). `Data` = what must be fetched.
`AI` = needs the optional OpenAI key. Questions whose data is unavailable (e.g. no PRs, no OpenAI
key, no planned effort) are **hidden or shown disabled with a reason**.

### A. Progress & Delivery (issue/task data)
| # | Question (user-facing) | Chart component | Data | AI |
|---|------------------------|-----------------|------|----|
| A1 | How much of the work is done? | `CompletionChart` ×3 (count / planned effort / overall) | tasks | – |
| A2 | How is work distributed across statuses? | `StatusChart` | tasks | – |
| A3 | How many tasks of each size shipped per sprint? | `SprintChart` | tasks | – |
| A4 | Is our sprint velocity steady or slipping? | `SprintVelocityChart` | tasks | – |

### B. Planning & Forecasting (issue/task data)
| # | Question | Chart component | Data | AI |
|---|----------|-----------------|------|----|
| B1 | When will the project finish vs. the deadline? | `EffortPredictionChart` | tasks + planned effort/date | – |
| B2 | How long will a filtered set of work take with N developers? | `TimeEstimationWidget` | tasks | – |
| B3 | What does the schedule / critical path look like? | `TimelinePlanningChart` | tasks | – |
| B4 | How is issue volume growing over time (by label/type)? | `DimensionTimelineChart` | tasks | – |
| B5 | How many issues fall under each label/type? | `TypeLabelAnalysisChart` | tasks | – |

### C. Team & People — Issues (issue/task data)
| # | Question | Chart component | Data | AI |
|---|----------|-----------------|------|----|
| C1 | Who completed what, and at what size/complexity? | `AssigneeChart` | tasks | – |
| C2 | What share of the work did each assignee carry? | `AssigneePieCharts` | tasks | – |
| C3 | How is each assignee's effort trending over sprints? | `AssigneeLineCharts` | tasks | – |

### D. Team & People — Reviews/PRs (PR data)
| # | Question | Chart component | Data | AI |
|---|----------|-----------------|------|----|
| D1 | Who is doing the review work? | `ReviewerPieCharts` | PRs | – |
| D2 | How is each reviewer's activity trending? | `ReviewerLineCharts` | PRs | – |
| D3 | How much feedback is each author receiving over time? | `AuthorLineCharts` | PRs | – |
| D4 | How often does each author open PRs? | `AuthorPRFrequencyChart` | PRs | – |
| D5 | How long between consecutive PRs per author? | `AuthorPRIntervalChart` | PRs | – |

### E. Code & Pull Requests (PR data)
| # | Question | Chart component | Data | AI |
|---|----------|-----------------|------|----|
| E1 | Does PR size drive longer review times? | `PRReviewChart` | PRs | – |
| E2 | What's the state of our PR pipeline (open/merged/closed)? | `PRLifecycleChart` | PRs | – |
| E3 | How much code churn are we producing over time? | `CodeChurnChart` | PRs | – |
| E4 | How healthy is our review process? | `ReviewQualityChart` | PRs | – |
| E5 | What themes recur in review comments? | `ReviewWordCloudChart` | PRs | opt |

### F. Quality & Root Cause (issue/task data)
| # | Question | Chart component | Data | AI |
|---|----------|-----------------|------|----|
| F1 | What are the common root causes of our bugs? | `RCAWordCloudChart` | tasks | opt |

### G. Relationships (issue + PR data)
| # | Question | Chart component | Data | AI |
|---|----------|-----------------|------|----|
| G1 | How do issues and PRs depend on each other? | `IssueGraph` (D3) | tasks + PRs | – |

### H. Cross-cutting
| # | Question | Source | Data | AI |
|---|----------|--------|------|----|
| H1 | What should I pay attention to right now? | `Insights` aggregator (top-level summary; entry point) | tasks + PRs | – |

> **Total:** ~24 questions backed by the existing 24 components. H1 (Insights) is a natural
> "default" answer and a good landing answer after fetch.

---

## Phase Plan

Each phase is independently shippable and leaves the app working. Phases 1–5 deliver the new UX;
6–8 harden and clean up.

### Phase 0 — Foundations & audit (no user-visible change)
**Aim:** lock down the contract the new UX builds on.
- Create a single **question registry** module: `src/config/questions.ts`.
  - Export a `Question` type: `{ id, title, description, category, dataNeeds: ('tasks'|'prs')[], needsAI?: boolean, needsPlannedEffort?: boolean, render: ReactNode-factory }`.
  - Encode the Question Catalog above as data (id, title, category, data needs, flags). Leave
    `render` stubbed for now.
- Add a `QuestionCategory` enum/list matching groups A–H with display labels + ordering.
- Extract the completion-metric helpers (`fetchPlannedTaskCompletedCount`,
  `fetchPlannedTaskCompletedData`, `fetchoverAllCompletedData`) out of `ProjectDashboard.tsx`
  into `src/util/completionMetrics.ts` so they're reusable outside the dashboard.
- **Done when:** registry compiles and is unit-importable; no behavior change in the live app.

### Phase 1 — App shell & step routing
**Aim:** replace the "config box + always-on tabs" layout with a stepped flow.
- Introduce a top-level view state in `App.tsx` (or a small router/`useReducer`):
  `setup → fetching → questions → answer`. No external router needed (keeps GH Pages base happy);
  use in-memory state + a URL hash (`#/q/<id>`) for deep-linking (see Phase 7).
- Move data-fetch ownership **up** out of `ProjectDashboard` into an `AppDataProvider` /
  context (or a hook `useRepoData()`) that holds `flattenedData`, `prs`, `loading`, `progress`,
  `insights`, and exposes `fetch()`. This decouples fetching from rendering so the question/answer
  views can read data without re-running fetch.
- `ProjectDashboard` is temporarily kept behind a feature flag (`localStorage 'classic_dashboard'`)
  so we can fall back during migration.
- **Done when:** app boots into a `setup` step; choosing classic flag still shows the old tabs.

### Phase 2 — Setup step (minimal onboarding)
**Aim:** a clean, friendly first screen.
- Build `src/components/ui/Setup/SetupWizard.tsx` reusing `RepoConfiguration`'s fields but
  re-styled as a focused, single-purpose screen (logo/title + minimal inputs + one primary CTA).
- Required: owner, repo, GitHub token. Optional/collapsible "Advanced": Project ID, OpenAI key,
  planned effort, planned end date, project-key mapping.
- Validate inputs inline; persist to `localStorage` (existing `addConfiguration`).
- Primary CTA = **Connect & Fetch** → transitions to the `fetching` step and calls `fetch()`.
- **Done when:** a user can fill the form and trigger a fetch from the new screen.

### Phase 3 — Fetching step (data + status experience)
**Aim:** make fetch a clear, momentary stage rather than a button on a crowded page.
- Reuse existing fetch logic (`fetchProjectDetails` + `fetchPRs`) now owned by `useRepoData()`.
- Full-screen progress: PR fetch progress bar (already emitted via `onProgress`), task spinner,
  and clear error surface (reuse `appendRenderLog`).
- Compute the data-availability flags once after fetch: `hasTasks`, `hasPRs`, `hasOpenAI`,
  `hasPlannedEffort`. Store on the data context — the question list uses these to enable/disable
  questions.
- On success → transition to `questions` step. Cache hits should feel instant.
- **Done when:** fetch runs from the new flow, stores to RxDB, and lands on the question list.

### Phase 4 — Question picker (the new hub)
**Aim:** the core of the redesign — "What do you want to know?".
- Build `src/components/ui/Questions/QuestionList.tsx`:
  - Render questions from `src/config/questions.ts`, grouped by category (A–H) with section
    headers, as a clean card/list grid.
  - **Search box** to filter questions by title/keywords.
  - Disable (with tooltip reason) questions whose `dataNeeds`/flags aren't satisfied
    (e.g. "Needs PR data", "Add an OpenAI key to enable", "Set a planned end date").
  - Surface H1 (Insights summary) prominently at the top as the recommended starting point.
- Selecting a question sets the active question id and transitions to the `answer` step.
- A persistent slim header shows repo name + a "Change repo" affordance (→ back to setup).
- **Done when:** the list renders all questions, search works, gating works, selection routes.

### Phase 5 — Answer view (one question → one chart)
**Aim:** render only what answers the chosen question.
- Build `src/components/ui/Questions/AnswerView.tsx`:
  - Look up the active `Question` and call its `render` factory, passing the data it needs
    (`flattenedData`, `prs`, `styleOptions`, `openaiApiKey`, planned values, `onInsightsGenerated`).
  - Wire up each existing chart component into its question's `render` in `questions.ts`. This is
    mostly **moving JSX** out of `ProjectDashboard` tab content into per-question factories — no
    chart internals change.
  - Header: question title + a one-line plain-language **takeaway** (derive from existing insight
    callbacks where available, e.g. velocity/effort/assignee/reviewer lines already emit insights).
  - Prominent **"← Back to questions"** and "Ask another" controls.
  - Keep each chart lazy (`React.lazy` + `Suspense`) so only the selected chart's code/compute
    loads — this is where the performance win lands.
- Special cases to handle in factories:
  - A1 Completion → renders the 3 gauges together (it's conceptually one question).
  - B2/B3/B4/B5 currently live inside `IssueAnalysisDashboardV2` with shared filters — expose them
    individually, reusing the V2 filter hooks (`useRxDBFiltersV2`) scoped per answer view.
  - E5/F1 (word clouds) gracefully degrade without an OpenAI key (they already support this).
- **Done when:** every catalogued question renders its chart standalone from the question list,
  and only that chart mounts.

### Phase 5.5 — Reusable per-answer filtering
**Aim:** once an answer's chart is shown, let the user filter it — reusing the existing filter
machinery as much as possible, with the selection **persisted across answers** (and sessions).
- **Task-based answers** (A1–A4, B1–B5, C1–C3, F1, G1): wrap the chart in a shared
  `FilteredAnalysisAnswer` shell that owns `useRxDBFiltersV2` and the existing filter/dimension/
  advanced/expert panels. The chart consumes the hook's `filteredData`. The filter panel is
  collapsible (chart stays the focus) and **all task answers share one `storageKey`**, so a filter
  set in one answer carries to the next.
- **PR-based answers** (D1–D5, E1–E5): wrap the chart in a `DateFilteredAnswer` shell — a reusable
  date-range filter over PR `createdAt`, persisted to `localStorage` so the window carries across PR
  answers.
- **Composes with existing controls:** the per-person name search (`SearchableAnswer`) nests inside
  the filter shell for C/D answers; word-cloud answers keep AI degradation.
- H1 (Insights overview) stays unfiltered — it's a global summary.
- **Done when:** every chart answer exposes a filter affordance, the selection persists as the user
  hops between questions, and task answers reuse the RxDB filter panel rather than a bespoke one.

### Phase 6 — Migrate charts off the monolith
**Aim:** make the new path the only path.
- Remove the 5-tab `ProjectDashboard` from the default flow; the question registry is now the
  single source of truth for "what can be shown".
- Keep classic dashboard reachable only behind the `classic_dashboard` flag during a deprecation
  window, then delete it.
- Ensure per-chart `localStorage` filter keys still work (they're keyed by `storageKey` and are
  chart-local, so they survive the move).
- Verify Insights aggregation still works: insight-emitting charts (`SprintVelocityChart`,
  `EffortPredictionChart`, `AssigneeLineCharts`, `ReviewerLineCharts`, `AuthorLineCharts`) push to
  the data-context `insights` array even when rendered standalone, so H1 stays populated.
- **Done when:** default app has no tabs; all answers come through the question flow.

### Phase 7 — Deep-linking, filters & persistence polish
**Aim:** make it feel like a real product.
- URL hash deep-linking: `#/q/<questionId>` opens directly to an answer (shareable, refresh-safe);
  `#/` shows the list. Respect `base: '/github-issue-graph'`.
- Remember last-viewed question across sessions (`localStorage`). (Filter persistence landed in
  Phase 5.5.)
- "Recently viewed" / "favorites" row on the question list (nice-to-have).
- Empty/error states per answer (e.g. "No PRs found in this range").
- **Done when:** answers are deep-linkable and filters/selection persist sensibly.

### Phase 8 — Cleanup, docs, performance pass
**Aim:** finish strong.
- Delete dead code: old `ProjectDashboard` tab scaffolding, `IssueAnalysisDashboard` (v1) if unused
  after V2 reuse, and any now-orphaned layout helpers.
- Confirm code-splitting: bundle-analyze to verify charts load lazily; ECharts/D3 only pulled when
  their question is opened.
- Update `CLAUDE.md` "Render" / dashboard sections and add a short `docs/QUESTION_FLOW.md`
  describing the registry → list → answer architecture and how to add a new question.
- Accessibility & responsive pass on setup, list, and answer views.
- `npm run lint` clean; `npm run build_original` typechecks (note: `npm run build` skips `tsc`).
- **Done when:** docs updated, old code removed, lint/typecheck green.

### Phase 9 — Fetch performance & incremental sync
**Aim:** the fetch step is becoming the bottleneck — a full repo re-pull on every (post-TTL) load
blocks the entire question flow. Make first load faster and repeat loads near-instant, without
adding a backend.

**Why it's slow today (grounded in the code):**
- **Serial pagination + a hard 50ms `yieldToMain()` sleep per page** (`prFetcher.ts`,
  `projectFetcher.ts`). For thousands of items at 50/page that's hundreds of sequential round-trips,
  each paying network RTT + 50ms.
- **Page size is 50** (`github-pr-query.js`, `github-project-status-query.js`) where GraphQL allows
  **100** — double the round-trips needed.
- **All-or-nothing cache** (`commonFunctions.js`): `fetchFromCache` returns the whole dataset or
  nothing, invalidated wholesale by a 1-hour TTL (`CACHE_TTL_HOURS`). After expiry the app re-pulls
  the *entire* history even though only a few items changed.
- **Both datasets gate the UI**: `useRepoData.fetch()` does `Promise.all([tasks, prs])` then
  bulk-inserts — a tasks-only question still waits for every PR page, and nothing renders until both
  complete.
- **Heavy per-item payload**: the PR query pulls `reviews(10) × comments(30)` and the project query
  pulls `subIssues timelineItems(100)` for every item, even when the opened question never uses them.
- **No resilience**: a mid-pagination GraphQL error silently `return`s partial data; no retry/backoff
  for secondary rate-limits (403/429).

**Strategy (incremental, each independently shippable):**
1. **Cheap wins first.** Raise page size to 100; drop/shrink the blanket `yieldToMain()` delay (keep a
   minimal yield only if devtools-closed throttling is real). Roughly halves round-trips and removes
   fixed per-page latency.
2. **Incremental delta sync.** Both queries already order by `CREATED_AT`/support `updatedAt`. Persist
   a per-repo `lastSyncedAt` (and the newest item's cursor/timestamp). On reload, paginate newest-first
   and **stop early** once items older than `lastSyncedAt` are reached, then merge into the existing
   RxDB rows (`bulkInsert` is already an upsert). Turns the steady-state load from "re-pull everything"
   into "pull what changed."
3. **Serve cache instantly, refresh in background (stale-while-revalidate).** Render from RxDB/cache
   immediately (the data already lives in IndexedDB), then run the delta sync and let the RxDB
   subscriptions update charts in place. The question list should not block on a network round-trip
   when cached data exists. Surface a subtle "updating…" indicator instead of the full-screen spinner.
4. **Decouple tasks vs PRs.** Let `useRepoData` expose tasks and PRs independently so a tasks-only
   answer renders as soon as tasks land (don't `Promise.all`-gate the whole UI). Tie this to the
   per-question `dataNeeds` so the fetch can be prioritized/lazy per the opened question.
5. **Right-size payloads.** Split the heavy sub-selections (PR reviews/comments, issue sub-issues/
   timeline) into a second pass fetched only for questions that need them (E1/E4/E5, G1), keeping the
   first-paint query lean.
6. **Resilience.** Add retry-with-backoff on 403/429 + transient errors, honor `Retry-After`, and make
   partial-failure explicit (don't silently return a truncated set — surface it via the Phase 3 error
   path with a "retry / use cached" choice).

**RxDB note:** delta sync may want a `lastSyncedAt` field and a `cache`/sync-meta record; if a schema
shape changes, bump the collection `version` + add a migration (per the schema rules below).

**Done when:** a cached repo opens to the question list without a blocking network wait; a reload
fetches only changed items; first-load round-trips are materially reduced; and a mid-fetch failure
surfaces cleanly with cached data still usable.

---

## Cross-cutting concerns

- **No backend / client-only** stays true; nothing here adds a server.
- **RxDB schemas** (`taskSchema`/`prSchema`, versioned) are untouched — this is a presentation-layer
  refactor. If any answer needs a new indexed field later, bump `version` + add a migration.
- **Project-key indirection** (`useProjectKeys`) must be preserved in every migrated chart factory —
  read fields via `projectKeys[PROJECT_KEYS.X].value`, never hardcode names.
- **Token/keys** remain user-supplied in `localStorage`; never committed.
- **Feature flag** (`classic_dashboard`) gives a safe rollback during Phases 1–6.

## Suggested sequencing / size
- Phases 0–1: scaffolding (small, low risk).
- Phases 2–5: the redesign (the bulk of the work; 5 is the largest).
- Phases 6–8: migration + polish (medium).
- Phase 9: fetch performance — independent of the UX work; step 1 (page size / delay) is a quick win,
  steps 2–3 (delta sync + stale-while-revalidate) are the real payoff. Can land any time after Phase 3.

## Risks & mitigations
- **Charts coupled to tab context / shared filters** (esp. the V2 issue-analysis group) — mitigate
  by reusing `useRxDBFiltersV2` per answer and validating B2–B5 individually in Phase 5.
- **Insights depend on charts mounting to emit** — with standalone answers, H1 could be empty;
  mitigate by either (a) computing insights eagerly post-fetch in `useRepoData()`, or (b) treating
  H1 as "open the charts that generate insights." Prefer (a).
- **Regression risk from removing tabs** — keep the classic flag until Phase 6 sign-off.
</content>
</invoke>
