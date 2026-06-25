# Question Flow Architecture

The app's default experience is **question-driven**: a clean setup step fetches data, then the
user is shown a list of questions ("What do you want to know?"), and picking one renders only the
chart(s) that answer it. The legacy 5-tab dashboard is still available behind a toggle.

This doc describes the registry → list → answer architecture and how to add a new question.

## The flow

```
App.tsx
 └─ RepoDataProvider (owns fetch + RxDB data + insights + availability flags)
     └─ AppShell  (step machine + URL-hash routing)
         ├─ setup     → SetupWizard          (owner/repo/token; collapsible advanced)
         ├─ fetching  → FetchingStep          (full-screen status + error/retry)
         ├─ questions → QuestionList          (the hub: search, gating, "Start here")
         └─ answer    → AnswerView            (one question → one chart, lazy-loaded)
```

- **`AppShell`** (`src/components/ui/AppShell/AppShell.tsx`) owns the `setup → fetching → questions
  → answer` state machine and mirrors the active view to the URL hash (`#/q/<id>` = an answer,
  `#/` = the list). With saved config it auto-fetches on load and routes to the hash target, so
  answers are refresh-safe and shareable. Browser back/forward works via a `hashchange` listener.
- **`RepoDataProvider`** (`src/context/RepoDataContext.tsx`, `useRepoData()`) owns the data layer:
  `fetch()`, `flattenedData`, `prs`, `loading`, `prProgress`, `insights`, `error`, and the
  data-availability `flags` (`hasTasks`, `hasPRs`, `hasOpenAI`, `hasPlannedEffort`).

## The registry — `src/config/questions.tsx`

The single source of truth for "what can be shown". Each `Question` is data + a lazy render
factory:

```ts
interface Question {
  id: string;                 // stable, used for deep-linking (e.g. "A2")
  title: string;              // user-facing question
  description: string;        // shown under the title; also the takeaway fallback
  category: QuestionCategoryId;
  dataNeeds: ("tasks" | "prs")[];
  needsAI?: boolean;          // soft note (word clouds degrade without a key)
  needsPlannedEffort?: boolean;
  keywords?: string[];        // extra search terms
  render: (ctx: QuestionRenderContext) => ReactNode;
}
```

- **Gating** — `getQuestionAvailability(q, flags)` hard-gates on data needs (disabled with a reason
  tooltip), and treats AI as a soft, non-blocking note.
- **Search** — `questionMatchesSearch(q, term)` matches title/description/keywords.
- **Categories** — `QUESTION_CATEGORIES` (groups A–H) drive the section headers + ordering. H1 is
  surfaced as the "Start here" featured card.

Charts are referenced via `React.lazy`, so opening a question loads only that chart's code (ECharts
/ D3 are not in the default bundle).

## The answer view — `src/components/ui/Questions/AnswerView.tsx`

Looks up the active question, builds the `QuestionRenderContext` (`flattenedData`, `prs`,
`styleOptions`, `openaiApiKey`, planned values, `onInsightsGenerated`), and renders
`question.render(ctx)` under a `Suspense` boundary. It captures any insights the chart emits to show
a one-line plain-language **takeaway**.

## Reusable per-answer filters

Once a chart is shown the user can filter it; the selection persists across answers (and sessions):

- **Task answers** wrap the chart in **`FilteredAnalysisAnswer`** — a collapsible shell that owns
  `useRxDBFiltersV2` + the filter/dimension/advanced/expert panels and feeds the chart its
  `filteredData`. All task answers share one `storageKey`, so a filter set in one carries to the
  next.
- **PR answers** wrap the chart in **`DateFilteredAnswer`** — a reusable date-range filter over PR
  `createdAt`, persisted to `localStorage`.
- Person answers (assignee/reviewer/author) nest **`SearchableAnswer`** (name search) inside the
  filter shell.

## How to add a new question

1. Add an entry to `QUESTIONS` in `src/config/questions.tsx`:
   - Give it a stable `id`, `title`, `description`, `category`, and `dataNeeds`.
   - Add a `lazy(() => import(...))` for your chart component if it isn't already declared.
   - Write the `render` factory. Pull data from `ctx`; wrap it for filtering:
     - tasks → `<FilteredAnalysisAnswer>{(s) => <YourChart flattenedData={asRows(s.filteredData)} … />}</FilteredAnalysisAnswer>`
     - PRs → `<DateFilteredAnswer prs={ctx.prs}>{(prs) => <YourChart prs={asRows(prs)} … />}</DateFilteredAnswer>`
     - needs a name search → nest `<SearchableAnswer>`.
2. If it introduces a new category, add it to `QUESTION_CATEGORIES`.
3. That's it — it shows up in the list (gated by `dataNeeds`/flags), is searchable, deep-linkable
   at `#/q/<id>`, and lazy-loaded.

## Project-key indirection

Charts that compute effort/velocity must read custom fields via
`projectKeys[PROJECT_KEYS.X].value` (from `useProjectKeys()`), never hardcoded names. The completion
metrics live in `src/util/completionMetrics.ts`.

## Classic dashboard

The legacy 5-tab `ProjectDashboard` is preserved behind a header **"Classic view"** toggle (state +
`classic_dashboard` localStorage flag). It's isolated in `ClassicApp` and lazy-loaded, so it stays
out of the default bundle.
