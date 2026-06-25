import { lazy, type ReactNode } from "react";
import type { DataFlags } from "@/context/RepoDataContext";

/**
 * Question registry — the single source of truth for the question-driven UX.
 *
 * Each question maps to one (occasionally a small set of) existing chart
 * component(s). The catalog below is derived from the 5-tab dashboard; see
 * `docs/plans/upgrade_plan.md` (the "Question Catalog" section).
 *
 * Charts are loaded lazily so only the selected question's code/compute is
 * pulled in. The `render` factories live here; `AnswerView` wraps them in a
 * Suspense boundary.
 */

/** What kind of data a question needs before it can be answered. */
export type DataNeed = "tasks" | "prs";

/**
 * Everything an answer view can pass to a question's `render` factory. Charts
 * pick out the props they need. Kept loose on purpose so individual chart
 * factories stay decoupled from this shape.
 */
export interface QuestionRenderContext {
  flattenedData: Record<string, unknown>[] | null;
  prs: Record<string, unknown>[];
  styleOptions: { width: string; height: string };
  openaiApiKey?: string;
  plannedEffortForProject?: number;
  plannedEndDate?: string;
  searchTerm?: string;
  onInsightsGenerated?: (insights: unknown[]) => void;
}

export type QuestionRenderFactory = (ctx: QuestionRenderContext) => ReactNode;

export interface Question {
  /** Stable id used for routing / deep-linking (e.g. "A1"). */
  id: string;
  /** User-facing question text. */
  title: string;
  /** Short supporting line shown under the title. */
  description: string;
  /** Category group (A–H). */
  category: QuestionCategoryId;
  /** Data that must be present for this question to be enabled. */
  dataNeeds: DataNeed[];
  /** Needs the optional OpenAI key (degrades gracefully without it). */
  needsAI?: boolean;
  /** Needs a configured planned effort / end date. */
  needsPlannedEffort?: boolean;
  /** Search keywords (in addition to title/description). */
  keywords?: string[];
  /** Renders the chart(s) that answer this question. */
  render: QuestionRenderFactory;
}

/** Category ids matching groups A–H in the plan. */
export type QuestionCategoryId =
  | "progress"
  | "planning"
  | "team-issues"
  | "team-reviews"
  | "code-prs"
  | "quality"
  | "relationships"
  | "cross-cutting";

export interface QuestionCategory {
  id: QuestionCategoryId;
  /** Letter label from the plan (A–H), for stable ordering. */
  letter: string;
  /** Display label for the section header. */
  label: string;
  /** Sort order in the list. */
  order: number;
}

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  { id: "cross-cutting", letter: "H", label: "Start here", order: 0 },
  { id: "progress", letter: "A", label: "Progress & Delivery", order: 1 },
  { id: "planning", letter: "B", label: "Planning & Forecasting", order: 2 },
  { id: "team-issues", letter: "C", label: "Team & People — Issues", order: 3 },
  { id: "team-reviews", letter: "D", label: "Team & People — Reviews/PRs", order: 4 },
  { id: "code-prs", letter: "E", label: "Code & Pull Requests", order: 5 },
  { id: "quality", letter: "F", label: "Quality & Root Cause", order: 6 },
  { id: "relationships", letter: "G", label: "Relationships", order: 7 },
];

export const getCategory = (id: QuestionCategoryId): QuestionCategory =>
  QUESTION_CATEGORIES.find((c) => c.id === id)!;

// ---------------------------------------------------------------------------
// Lazily-loaded chart components & answer wrappers.
// ---------------------------------------------------------------------------

const StatusChart = lazy(() =>
  import("@/components/ui/ECharts/StatusChart").then((m) => ({ default: m.StatusChart }))
);
const SprintChart = lazy(() =>
  import("@/components/ui/ECharts/SprintChart").then((m) => ({ default: m.SprintChart }))
);
const SprintVelocityChart = lazy(() =>
  import("@/components/ui/ECharts/SprintVelocityChart").then((m) => ({ default: m.SprintVelocityChart }))
);
const EffortPredictionChart = lazy(() =>
  import("@/components/ui/ECharts/EffortPredictionChart").then((m) => ({ default: m.EffortPredictionChart }))
);
const AssigneeChart = lazy(() =>
  import("@/components/ui/ECharts/AssigneeChart").then((m) => ({ default: m.AssigneeChart }))
);
const AssigneePieCharts = lazy(() =>
  import("@/components/ui/ECharts/AssigneePieCharts").then((m) => ({ default: m.AssigneePieCharts }))
);
const AssigneeLineCharts = lazy(() =>
  import("@/components/ui/ECharts/AssigneeLineCharts").then((m) => ({ default: m.AssigneeLineCharts }))
);
const ReviewerPieCharts = lazy(() =>
  import("@/components/ui/ECharts/ReviewerPieCharts").then((m) => ({ default: m.ReviewerPieCharts }))
);
const ReviewerLineCharts = lazy(() =>
  import("@/components/ui/ECharts/ReviewerLineCharts").then((m) => ({ default: m.ReviewerLineCharts }))
);
const AuthorLineCharts = lazy(() =>
  import("@/components/ui/ECharts/AuthorLineCharts").then((m) => ({ default: m.AuthorLineCharts }))
);
const AuthorPRFrequencyChart = lazy(() =>
  import("@/components/ui/ECharts/AuthorPRFrequencyChart").then((m) => ({ default: m.AuthorPRFrequencyChart }))
);
const AuthorPRIntervalChart = lazy(() =>
  import("@/components/ui/ECharts/AuthorPRIntervalChart").then((m) => ({ default: m.AuthorPRIntervalChart }))
);
const PRReviewChart = lazy(() =>
  import("@/components/ui/ECharts/PRReviewChart").then((m) => ({ default: m.PRReviewChart }))
);
const PRLifecycleChart = lazy(() =>
  import("@/components/ui/ECharts/PRLifecycleChart").then((m) => ({ default: m.PRLifecycleChart }))
);
const CodeChurnChart = lazy(() =>
  import("@/components/ui/ECharts/CodeChurnChart").then((m) => ({ default: m.CodeChurnChart }))
);
const ReviewQualityChart = lazy(() =>
  import("@/components/ui/ECharts/ReviewQualityChart").then((m) => ({ default: m.ReviewQualityChart }))
);
const ReviewWordCloudChart = lazy(() =>
  import("@/components/ui/ECharts/ReviewWordCloudChart").then((m) => ({ default: m.ReviewWordCloudChart }))
);
const TimeEstimationWidget = lazy(() =>
  import("@/components/ui/ECharts/TimeEstimationWidget").then((m) => ({ default: m.TimeEstimationWidget }))
);
const TimelinePlanningChart = lazy(() =>
  import("@/components/ui/ECharts/TimelinePlanningChart").then((m) => ({ default: m.TimelinePlanningChart }))
);
const DimensionTimelineChart = lazy(() =>
  import("@/components/ui/ECharts/DimensionTimelineChart").then((m) => ({ default: m.DimensionTimelineChart }))
);
const TypeLabelAnalysisChart = lazy(() =>
  import("@/components/ui/ECharts/TypeLabelAnalysisChart").then((m) => ({ default: m.TypeLabelAnalysisChart }))
);
const RCAWordCloudChart = lazy(() =>
  import("@/components/ui/ECharts/RCAWordCloudChart").then((m) => ({ default: m.RCAWordCloudChart }))
);
const IssueGraph = lazy(() =>
  import("@/components/ui/IssueGraph/IssueGraph").then((m) => ({ default: m.IssueGraph }))
);

const CompletionAnswer = lazy(() =>
  import("@/components/ui/Questions/answers/CompletionAnswer").then((m) => ({ default: m.CompletionAnswer }))
);
const InsightsAnswer = lazy(() =>
  import("@/components/ui/Questions/answers/InsightsAnswer").then((m) => ({ default: m.InsightsAnswer }))
);
const SearchableAnswer = lazy(() =>
  import("@/components/ui/Questions/answers/SearchableAnswer").then((m) => ({ default: m.SearchableAnswer }))
);
const FilteredAnalysisAnswer = lazy(() =>
  import("@/components/ui/Questions/answers/FilteredAnalysisAnswer").then((m) => ({ default: m.FilteredAnalysisAnswer }))
);
const DateFilteredAnswer = lazy(() =>
  import("@/components/ui/Questions/answers/DateFilteredAnswer").then((m) => ({ default: m.DateFilteredAnswer }))
);

// Charts consume the flattened task/PR data dynamically; the registry passes
// it through untyped (the data pipeline is JS/untyped end to end).
const asRows = (data: unknown[] | null | undefined): never[] => (data ?? []) as never[];

/**
 * The question catalog. Order within a category follows the plan's tables.
 * H1 (Insights) is listed first so it can be surfaced as the recommended
 * starting point.
 */
export const QUESTIONS: Question[] = [
  // H. Cross-cutting
  {
    id: "H1",
    title: "What should I pay attention to right now?",
    description: "A top-level summary of the most important signals across issues and PRs.",
    category: "cross-cutting",
    dataNeeds: ["tasks", "prs"],
    keywords: ["insights", "summary", "overview", "attention", "highlights"],
    render: (ctx) => (
      <InsightsAnswer
        flattenedData={ctx.flattenedData}
        prs={ctx.prs}
        plannedEffortForProject={ctx.plannedEffortForProject}
        plannedEndDate={ctx.plannedEndDate}
        styleOptions={ctx.styleOptions}
        onInsightsGenerated={ctx.onInsightsGenerated}
      />
    ),
  },

  // A. Progress & Delivery
  {
    id: "A1",
    title: "How much of the work is done?",
    description: "Completion by task count, by planned effort, and overall.",
    category: "progress",
    dataNeeds: ["tasks"],
    keywords: ["completion", "done", "progress", "percent"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <CompletionAnswer
            flattenedData={asRows(s.filteredData)}
            plannedEffortForProject={ctx.plannedEffortForProject}
            styleOptions={ctx.styleOptions}
          />
        )}
      </FilteredAnalysisAnswer>
    ),
  },
  {
    id: "A2",
    title: "How is work distributed across statuses?",
    description: "Count of tasks in each workflow status.",
    category: "progress",
    dataNeeds: ["tasks"],
    keywords: ["status", "distribution", "workflow", "todo", "in progress"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <StatusChart flattenedData={asRows(s.filteredData)} styleOptions={ctx.styleOptions} />
        )}
      </FilteredAnalysisAnswer>
    ),
  },
  {
    id: "A3",
    title: "How many tasks of each size shipped per sprint?",
    description: "Tasks completed per sprint, broken down by size.",
    category: "progress",
    dataNeeds: ["tasks"],
    keywords: ["sprint", "size", "shipped", "throughput"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <SprintChart flattenedData={asRows(s.filteredData)} styleOptions={ctx.styleOptions} />
        )}
      </FilteredAnalysisAnswer>
    ),
  },
  {
    id: "A4",
    title: "Is our sprint velocity steady or slipping?",
    description: "Velocity trend across sprints.",
    category: "progress",
    dataNeeds: ["tasks"],
    keywords: ["velocity", "sprint", "trend", "slipping"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <SprintVelocityChart
            flattenedData={asRows(s.filteredData)}
            styleOptions={ctx.styleOptions}
            onInsightsGenerated={ctx.onInsightsGenerated}
          />
        )}
      </FilteredAnalysisAnswer>
    ),
  },

  // B. Planning & Forecasting
  {
    id: "B1",
    title: "When will the project finish vs. the deadline?",
    description: "Projected completion based on effort, compared to the planned end date.",
    category: "planning",
    dataNeeds: ["tasks"],
    needsPlannedEffort: true,
    keywords: ["forecast", "deadline", "prediction", "finish", "effort"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <EffortPredictionChart
            flattenedData={asRows(s.filteredData)}
            styleOptions={ctx.styleOptions}
            onInsightsGenerated={ctx.onInsightsGenerated}
            plannedEffortForProject={ctx.plannedEffortForProject}
            plannedEndDate={ctx.plannedEndDate}
          />
        )}
      </FilteredAnalysisAnswer>
    ),
  },
  {
    id: "B2",
    title: "How long will a filtered set of work take with N developers?",
    description: "Estimate time-to-complete for a filtered subset of tasks.",
    category: "planning",
    dataNeeds: ["tasks"],
    keywords: ["estimate", "time", "developers", "capacity"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <TimeEstimationWidget
            filteredData={s.filteredData}
            filterableFields={s.filterableFields}
            styleOptions={ctx.styleOptions}
          />
        )}
      </FilteredAnalysisAnswer>
    ),
  },
  {
    id: "B3",
    title: "What does the schedule / critical path look like?",
    description: "Timeline and critical path across planned work.",
    category: "planning",
    dataNeeds: ["tasks"],
    keywords: ["timeline", "schedule", "critical path", "gantt"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <TimelinePlanningChart
            filteredData={s.filteredData}
            filterableFields={s.filterableFields}
            styleOptions={ctx.styleOptions}
          />
        )}
      </FilteredAnalysisAnswer>
    ),
  },
  {
    id: "B4",
    title: "How is issue volume growing over time (by label/type)?",
    description: "Issue volume trend over time, split by label or type.",
    category: "planning",
    dataNeeds: ["tasks"],
    keywords: ["volume", "growth", "timeline", "label", "type"],
    render: (ctx) => (
      <FilteredAnalysisAnswer showDimensions>
        {(s) => (
          <DimensionTimelineChart
            filteredData={s.filteredData}
            selectedDimensionField={s.selectedDimensionField}
            selectedDimensionValues={s.selectedDimensionValues}
            styleOptions={ctx.styleOptions}
          />
        )}
      </FilteredAnalysisAnswer>
    ),
  },
  {
    id: "B5",
    title: "How many issues fall under each label/type?",
    description: "Counts of issues per label and type.",
    category: "planning",
    dataNeeds: ["tasks"],
    keywords: ["label", "type", "count", "breakdown"],
    render: (ctx) => (
      <FilteredAnalysisAnswer showDimensions>
        {(s) => (
          <TypeLabelAnalysisChart
            filteredData={s.filteredData}
            selectedDimensionField={s.selectedDimensionField}
            selectedDimensionValues={s.selectedDimensionValues}
            filterOperator={s.filterOperator}
            selectedFilters={s.selectedFilters}
            styleOptions={ctx.styleOptions}
          />
        )}
      </FilteredAnalysisAnswer>
    ),
  },

  // C. Team & People — Issues
  {
    id: "C1",
    title: "Who completed what, and at what size/complexity?",
    description: "Completed work per assignee, broken down by size.",
    category: "team-issues",
    dataNeeds: ["tasks"],
    keywords: ["assignee", "completed", "size", "complexity", "who"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <SearchableAnswer>
            {(term) => (
              <AssigneeChart
                flattenedData={asRows(s.filteredData)}
                styleOptions={ctx.styleOptions}
                searchTerm={term}
              />
            )}
          </SearchableAnswer>
        )}
      </FilteredAnalysisAnswer>
    ),
  },
  {
    id: "C2",
    title: "What share of the work did each assignee carry?",
    description: "Each assignee's share of the overall workload.",
    category: "team-issues",
    dataNeeds: ["tasks"],
    keywords: ["assignee", "share", "distribution", "pie"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <SearchableAnswer>
            {(term) => (
              <AssigneePieCharts
                flattenedData={asRows(s.filteredData)}
                styleOptions={ctx.styleOptions}
                searchTerm={term}
              />
            )}
          </SearchableAnswer>
        )}
      </FilteredAnalysisAnswer>
    ),
  },
  {
    id: "C3",
    title: "How is each assignee's effort trending over sprints?",
    description: "Per-assignee effort trend across sprints.",
    category: "team-issues",
    dataNeeds: ["tasks"],
    keywords: ["assignee", "effort", "trend", "sprint"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <SearchableAnswer>
            {(term) => (
              <AssigneeLineCharts
                flattenedData={asRows(s.filteredData)}
                styleOptions={ctx.styleOptions}
                searchTerm={term}
                onInsightsGenerated={ctx.onInsightsGenerated}
              />
            )}
          </SearchableAnswer>
        )}
      </FilteredAnalysisAnswer>
    ),
  },

  // D. Team & People — Reviews/PRs
  {
    id: "D1",
    title: "Who is doing the review work?",
    description: "Review contributions per reviewer.",
    category: "team-reviews",
    dataNeeds: ["prs"],
    keywords: ["reviewer", "reviews", "who", "pie"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => (
          <SearchableAnswer>
            {(term) => (
              <ReviewerPieCharts
                flattenedData={asRows(prs)}
                styleOptions={ctx.styleOptions}
                searchTerm={term}
              />
            )}
          </SearchableAnswer>
        )}
      </DateFilteredAnswer>
    ),
  },
  {
    id: "D2",
    title: "How is each reviewer's activity trending?",
    description: "Per-reviewer activity trend over time.",
    category: "team-reviews",
    dataNeeds: ["prs"],
    keywords: ["reviewer", "activity", "trend"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => (
          <SearchableAnswer>
            {(term) => (
              <ReviewerLineCharts
                flattenedData={asRows(prs)}
                styleOptions={ctx.styleOptions}
                searchTerm={term}
                onInsightsGenerated={ctx.onInsightsGenerated}
              />
            )}
          </SearchableAnswer>
        )}
      </DateFilteredAnswer>
    ),
  },
  {
    id: "D3",
    title: "How much feedback is each author receiving over time?",
    description: "Feedback received per author over time.",
    category: "team-reviews",
    dataNeeds: ["prs"],
    keywords: ["author", "feedback", "comments", "trend"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => (
          <SearchableAnswer>
            {(term) => (
              <AuthorLineCharts
                flattenedData={asRows(prs)}
                styleOptions={ctx.styleOptions}
                searchTerm={term}
                onInsightsGenerated={ctx.onInsightsGenerated}
              />
            )}
          </SearchableAnswer>
        )}
      </DateFilteredAnswer>
    ),
  },
  {
    id: "D4",
    title: "How often does each author open PRs?",
    description: "PR open frequency per author.",
    category: "team-reviews",
    dataNeeds: ["prs"],
    keywords: ["author", "frequency", "pull requests", "cadence"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => <AuthorPRFrequencyChart prs={asRows(prs)} styleOptions={ctx.styleOptions} />}
      </DateFilteredAnswer>
    ),
  },
  {
    id: "D5",
    title: "How long between consecutive PRs per author?",
    description: "Interval between consecutive PRs for each author.",
    category: "team-reviews",
    dataNeeds: ["prs"],
    keywords: ["author", "interval", "cadence", "gap"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => <AuthorPRIntervalChart prs={asRows(prs)} styleOptions={ctx.styleOptions} />}
      </DateFilteredAnswer>
    ),
  },

  // E. Code & Pull Requests
  {
    id: "E1",
    title: "Does PR size drive longer review times?",
    description: "Relationship between PR size and review duration.",
    category: "code-prs",
    dataNeeds: ["prs"],
    keywords: ["pr size", "review time", "correlation"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => <PRReviewChart prs={asRows(prs)} styleOptions={ctx.styleOptions} />}
      </DateFilteredAnswer>
    ),
  },
  {
    id: "E2",
    title: "What's the state of our PR pipeline (open/merged/closed)?",
    description: "PR lifecycle breakdown across states.",
    category: "code-prs",
    dataNeeds: ["prs"],
    keywords: ["pipeline", "open", "merged", "closed", "lifecycle"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => <PRLifecycleChart prs={asRows(prs)} styleOptions={ctx.styleOptions} />}
      </DateFilteredAnswer>
    ),
  },
  {
    id: "E3",
    title: "How much code churn are we producing over time?",
    description: "Additions and deletions over time.",
    category: "code-prs",
    dataNeeds: ["prs"],
    keywords: ["churn", "additions", "deletions", "code"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => <CodeChurnChart prs={asRows(prs)} styleOptions={ctx.styleOptions} />}
      </DateFilteredAnswer>
    ),
  },
  {
    id: "E4",
    title: "How healthy is our review process?",
    description: "Review quality and health indicators.",
    category: "code-prs",
    dataNeeds: ["prs"],
    keywords: ["review", "quality", "health"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => <ReviewQualityChart prs={asRows(prs)} styleOptions={ctx.styleOptions} />}
      </DateFilteredAnswer>
    ),
  },
  {
    id: "E5",
    title: "What themes recur in review comments?",
    description: "Common themes across review comments (AI-assisted).",
    category: "code-prs",
    dataNeeds: ["prs"],
    needsAI: true,
    keywords: ["themes", "review comments", "word cloud", "ai"],
    render: (ctx) => (
      <DateFilteredAnswer prs={ctx.prs}>
        {(prs) => (
          <ReviewWordCloudChart
            prs={asRows(prs)}
            styleOptions={ctx.styleOptions}
            openaiApiKey={ctx.openaiApiKey}
          />
        )}
      </DateFilteredAnswer>
    ),
  },

  // F. Quality & Root Cause
  {
    id: "F1",
    title: "What are the common root causes of our bugs?",
    description: "Recurring root causes across bug reports (AI-assisted).",
    category: "quality",
    dataNeeds: ["tasks"],
    needsAI: true,
    keywords: ["root cause", "rca", "bugs", "quality", "word cloud", "ai"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => (
          <RCAWordCloudChart
            issues={s.filteredData as { Type?: string; body?: string; title?: string; issue_number?: number; labels?: Array<{ name: string }> }[]}
            styleOptions={ctx.styleOptions}
            openaiApiKey={ctx.openaiApiKey}
          />
        )}
      </FilteredAnalysisAnswer>
    ),
  },

  // G. Relationships
  {
    id: "G1",
    title: "How do issues and PRs depend on each other?",
    description: "Dependency graph linking issues and PRs.",
    category: "relationships",
    dataNeeds: ["tasks", "prs"],
    keywords: ["graph", "dependency", "relationships", "links"],
    render: (ctx) => (
      <FilteredAnalysisAnswer>
        {(s) => <IssueGraph issues={asRows(s.filteredData)} prs={asRows(ctx.prs)} />}
      </FilteredAnalysisAnswer>
    ),
  },
];

export const getQuestion = (id: string): Question | undefined =>
  QUESTIONS.find((q) => q.id === id);

export interface QuestionAvailability {
  enabled: boolean;
  /** Why the question is disabled (shown as a tooltip). */
  reason?: string;
  /** A soft, non-blocking note (e.g. AI questions without a key). */
  note?: string;
}

/**
 * Decide whether a question can be answered given the fetched data. Data needs
 * are hard gates; AI is a soft note because the word-cloud answers degrade
 * gracefully without an OpenAI key.
 */
export const getQuestionAvailability = (
  q: Question,
  flags: DataFlags
): QuestionAvailability => {
  if (q.dataNeeds.includes("tasks") && !flags.hasTasks) {
    return { enabled: false, reason: "Needs issue / task data" };
  }
  if (q.dataNeeds.includes("prs") && !flags.hasPRs) {
    return { enabled: false, reason: "Needs pull request data" };
  }
  if (q.needsPlannedEffort && !flags.hasPlannedEffort) {
    return { enabled: false, reason: "Set a planned effort or end date in Setup" };
  }
  if (q.needsAI && !flags.hasOpenAI) {
    return { enabled: true, note: "Better with an OpenAI key" };
  }
  return { enabled: true };
};

/** True if a question matches a free-text search term (title/desc/keywords). */
export const questionMatchesSearch = (q: Question, term: string): boolean => {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const haystack = [q.title, q.description, ...(q.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return haystack.includes(t);
};

/** Questions grouped by category, in display order. */
export const getQuestionsByCategory = (): {
  category: QuestionCategory;
  questions: Question[];
}[] =>
  [...QUESTION_CATEGORIES]
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      category,
      questions: QUESTIONS.filter((q) => q.category === category.id),
    }))
    .filter((group) => group.questions.length > 0);
