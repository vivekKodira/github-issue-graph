# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Client-side-only React 19 + Vite + TypeScript SPA that visualizes GitHub issues and pull requests as interactive ECharts/D3 dashboards. There is no backend — the browser calls the GitHub API directly, and all data lives in the user's browser (RxDB/IndexedDB + localStorage). Deployed to GitHub Pages at `/github-issue-graph/`.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # vite build (NOTE: does NOT typecheck — see below)
npm run lint       # eslint .
npm run preview    # preview the production build
npm run deploy     # build + push dist/ to gh-pages branch
npm run anonymize  # scripts/anonymize.js — scrub author/assignee/reviewer names from sample JSON
```

- **There is no test runner.** `__mocks__/` is empty and no test script exists; do not assume tests.
- `npm run build` runs `vite build` only — it skips `tsc`. Type errors will NOT fail the build. Use `npm run build_original` (`tsc -b && vite build`) to typecheck. `tsconfig.app.json` has `strict: false` but `noUnusedLocals`/`noUnusedParameters: true`.
- Import alias: `@/*` → `src/*` (configured in `tsconfig.app.json` + `vite-tsconfig-paths`).
- `vite.config.ts` sets `base: '/github-issue-graph'` — required for GitHub Pages, keep it.

## Architecture

### Data pipeline (the core flow)
1. **Fetch** — `src/util/projectFetcher.ts` (GraphQL, used when a Project ID is configured) or `src/util/issueFetcher.js` (REST, repo-only). PRs come from `src/util/prFetcher.ts`. Queries live in `github-project-status-query.js` / `github-pr-query.js`. Responses are cached via `commonFunctions.js` (`fetchFromCache`/`updateLocalCache`).
2. **Normalize** — `src/util/taskConverter.ts` flattens GraphQL/REST responses into a single flat `TaskFormat` shape (`convertGraphQLFormat` / `convertRestApiFormat`). All charts consume this shape.
3. **Store** — `src/db/rxdb.ts` defines the RxDB database (Dexie/IndexedDB storage) with `tasks` and `prs` collections. Data is bulk-inserted (`bulkInsertTasks`/`bulkInsertPRs`) and read back with `taskFromRxDBFormat`/`prFromRxDBFormat`.
4. **Render** — Components subscribe reactively to RxDB and render ECharts. Fetch → store is owned by `RepoDataProvider` (`useRepoData()`); rendering is question-driven (see below).

### App flow (question-driven)
The default UX is a stepped, question-driven flow (`setup → fetching → questions → answer`), **not** the old all-at-once dashboard. See `docs/QUESTION_FLOW.md` for the full architecture and how to add a question.
- **`AppShell`** (`src/components/ui/AppShell/AppShell.tsx`) owns the step machine and mirrors the active view to the URL hash (`#/q/<id>` = answer, `#/` = list); auto-fetches on load when config exists (refresh-safe / shareable).
- **Question registry** (`src/config/questions.tsx`) is the single source of truth for "what can be shown": each `Question` is data (`id/title/category/dataNeeds/...`) + a `React.lazy` render factory. `QuestionList` renders the gated, searchable hub; `AnswerView` renders one question's chart under `Suspense`.
- **Per-answer filtering** is reused, not re-implemented: task answers wrap charts in `FilteredAnalysisAnswer` (RxDB filters), PR answers in `DateFilteredAnswer` (date range); selections persist across answers.
- The legacy 5-tab **`ProjectDashboard`** is preserved behind a header **"Classic view"** toggle (`classic_dashboard` flag), isolated in `ClassicApp` and lazy-loaded so it stays out of the default bundle.

### State & config
- **No global store.** App-level config (repo owner, repo, project ID, GitHub token, optional OpenAI key, planned effort/date) lives in React state in `App.tsx` (read synchronously from `localStorage`), persisted back to `localStorage`, and passed down as props.
- **`RepoDataContext`** (`src/context/RepoDataContext.tsx`, `useRepoData()`) — owns the data layer: `fetch()`, `flattenedData`, `prs`, `loading`, `prProgress`, `insights`, `error`, and data-availability `flags` (`hasTasks`/`hasPRs`/`hasOpenAI`/`hasPlannedEffort`) used to gate questions.
- **`RxDBContext`** (`src/context/RxDBContext.tsx`, `useRxDB()`) — provides the database instance + `isReady`. Wraps the app in `main.tsx`.
- **`ProjectKeysContext`** (`useProjectKeys()`) — maps the app's logical custom fields to the user's actual GitHub project field names. The four keys (`Size`, `Sprint`, `Estimate (days)`, `Actual (days)`) are defined in `src/config/projectKeys.ts` and `projectKeyConfigs.ts`. Charts that compute effort/velocity read fields via `projectKeys[PROJECT_KEYS.X].value`, never hardcoded names — preserve this indirection.

### Charts & filtering
- All chart components are in `src/components/ui/ECharts/`. ECharts is wrapped by `ECharts.tsx`; chart option builders live in `templates/`.
- **Two filtering systems coexist:**
  - Legacy in-memory: `useFilterableDimensions` (filters a JS array in memory). Documented in `ECharts/FILTER_DIMENSION_USAGE.md`. Used with `FilterPanel`/`DimensionPanel`.
  - RxDB-based: `useRxDBFiltersV2` (reactive RxDB Mango queries built by `src/util/mangoQueryBuilder.ts`, supporting simple/advanced/expert filter modes). This is the newer path — see `docs/RXDB_MIGRATION.md`. (The v1 `useRxDBFilters` hook + `IssueAnalysisDashboard` were removed in the question-flow cleanup.)
  - When adding filtered charts, prefer the RxDB hooks. In the question flow this is wrapped by `FilteredAnalysisAnswer`. Each chart's filter/dimension selections persist to `localStorage` under a unique `storageKey`.
- **Issue dependency graph** (`src/components/ui/IssueGraph/`) is D3-based (`graphCreator.js` + `graph.js`), separate from the ECharts charts.

### RxDB schema changes
`taskSchema`/`prSchema` in `src/db/rxdb.ts` are **versioned** (currently task `version: 2`). RxDB enforces migrations: any change to a schema's shape requires bumping `version` and providing migration strategies, or users' existing IndexedDB data will fail to load. Indexed fields (`Status`, `Type`, `author`, `state`, `_updatedAt`) matter for query performance.

## Conventions & gotchas
- Mixed `.ts`/`.tsx` and plain `.js` — older util/query/graph files are JavaScript and untyped; newer code is TypeScript. Match the file you're editing.
- **Debug mode** is runtime, no rebuild: `localStorage.setItem('ENABLE_DEBUG','true')` logs the first task's structure and downloads `flattened_tasks_debug.json`. There's also a `demo_mode` localStorage flag (loads `src/samples/*.json`) and render logging via `src/util/renderDebugLog.ts`.
- The **GitHub token and OpenAI key are user-supplied and stored in localStorage** — they are never committed. The OpenAI key is optional and only powers the AI word-cloud charts (`ReviewWordCloudChart`, `RCAWordCloudChart`).
- `src/samples/` is gitignored (anonymized fixtures); generate them with `npm run anonymize`.
