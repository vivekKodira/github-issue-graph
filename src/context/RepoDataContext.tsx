import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import fetchProjectDetails from "@/util/projectFetcher";
import fetchPRs from "@/util/prFetcher";
import { useRxDB } from "@/context/RxDBContext";
import {
  bulkInsertTasks,
  bulkInsertPRs,
  taskFromRxDBFormat,
  prFromRxDBFormat,
} from "@/db/rxdb";
import { appendRenderLog } from "@/util/renderDebugLog";

export interface Insight {
  text: string;
  icon: React.ComponentType;
  severity: number;
}

export interface RepoConfig {
  repoOwner: string;
  repository: string;
  project: string;
  githubToken: string;
  openaiApiKey?: string;
  plannedEffortForProject?: number;
  plannedEndDate?: string;
}

/** Data-availability flags used to enable/disable questions. */
export interface DataFlags {
  hasTasks: boolean;
  hasPRs: boolean;
  hasOpenAI: boolean;
  hasPlannedEffort: boolean;
}

export interface RepoDataValue {
  flattenedData: Record<string, unknown>[] | null;
  prs: Record<string, unknown>[];
  loading: boolean;
  prProgress: { fetched: number; total: number } | null;
  insights: Insight[];
  flags: DataFlags;
  /** True once a fetch has completed at least once this session. */
  hasFetched: boolean;
  /** True once the underlying RxDB instance is initialized and ready. */
  isDbReady: boolean;
  /** Human-readable error from the last fetch, or null on success. */
  error: string | null;
  fetch: () => Promise<void>;
  addInsights: (newInsights: Insight[]) => void;
  resetInsights: () => void;
}

const ENABLE_DEBUG = () => localStorage.getItem("ENABLE_DEBUG") === "true";

const debugDownloadData = (data: unknown[], filename: string) => {
  if (!ENABLE_DEBUG()) return;

  console.log(`Debug: ${filename} (first item):`, data[0]);
  console.log(`Debug: All fields in first item:`, Object.keys(data[0] || {}));

  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const RepoDataContext = createContext<RepoDataValue | null>(null);

export function RepoDataProvider({
  config,
  children,
}: {
  config: RepoConfig;
  children: ReactNode;
}) {
  const { db, isReady: isDbReady } = useRxDB();

  const [flattenedData, setFlattenedData] = useState<
    Record<string, unknown>[] | null
  >(null);
  const [prs, setPRs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [prProgress, setPrProgress] = useState<{
    fetched: number;
    total: number;
  } | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insightsRef = useRef<Insight[]>([]);

  const {
    repoOwner,
    repository,
    project,
    githubToken,
    openaiApiKey,
    plannedEffortForProject = 0,
    plannedEndDate = "",
  } = config;

  const resetInsights = useCallback(() => {
    setInsights([]);
    insightsRef.current = [];
  }, []);

  const addInsights = useCallback((newInsights: Insight[]) => {
    const validInsights = newInsights.map((insight) => ({
      ...insight,
      severity: insight.severity || 0,
    }));

    setInsights((prevInsights) => {
      const uniqueNewInsights = validInsights.filter(
        (newInsight) =>
          !prevInsights.some(
            (existingInsight) => existingInsight.text === newInsight.text
          )
      );
      return [...prevInsights, ...uniqueNewInsights];
    });
  }, []);

  const fetch = useCallback(async () => {
    if (!isDbReady) {
      console.error("Database is not ready");
      return;
    }

    setLoading(true);
    setPrProgress(null);
    setError(null);
    appendRenderLog("Render started");
    try {
      resetInsights();

      const [flattenedTasks, fetchedPRs] = await Promise.all([
        fetchProjectDetails({
          projectID: project,
          repoOwner: repoOwner,
          repository: repository,
          githubToken: githubToken,
        }),
        fetchPRs({
          repoOwner: repoOwner,
          repository: repository,
          githubToken: githubToken,
          onProgress: (fetched: number, total: number) =>
            setPrProgress({ fetched, total }),
        }),
      ]);

      if (flattenedTasks && flattenedTasks.length > 0) {
        debugDownloadData(flattenedTasks, "flattened_tasks_debug.json");
        await bulkInsertTasks(flattenedTasks);
        setFlattenedData(flattenedTasks);
      }

      if (fetchedPRs && fetchedPRs.length > 0) {
        await bulkInsertPRs(fetchedPRs);
        setPRs(fetchedPRs);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      appendRenderLog(`Render error: ${msg}`);
      console.error("Error fetching data:", err);
      setError(msg);
    } finally {
      appendRenderLog("Render finished");
      setLoading(false);
      setPrProgress(null);
      setHasFetched(true);
    }
  }, [
    isDbReady,
    project,
    repoOwner,
    repository,
    githubToken,
    resetInsights,
  ]);

  // Subscribe to RxDB data changes so charts stay reactive.
  useEffect(() => {
    if (!db || !isDbReady) return;

    const tasksSubscription = db.tasks
      .find()
      .sort({ updatedAt: "desc" })
      .$.subscribe((docs: unknown[]) => {
        if (docs.length > 0) {
          const tasks = docs.map(taskFromRxDBFormat);
          setFlattenedData(tasks);
        }
      });

    const prsSubscription = db.prs
      .find()
      .sort({ updatedAt: "desc" })
      .$.subscribe((docs: unknown[]) => {
        if (docs.length > 0) {
          const prData = docs.map(prFromRxDBFormat);
          setPRs(prData);
        }
      });

    return () => {
      tasksSubscription.unsubscribe();
      prsSubscription.unsubscribe();
    };
  }, [db, isDbReady]);

  const flags = useMemo<DataFlags>(
    () => ({
      hasTasks: Boolean(flattenedData?.length),
      hasPRs: prs.length > 0,
      hasOpenAI: Boolean(openaiApiKey),
      hasPlannedEffort: plannedEffortForProject > 0 || Boolean(plannedEndDate),
    }),
    [flattenedData, prs.length, openaiApiKey, plannedEffortForProject, plannedEndDate]
  );

  const value = useMemo<RepoDataValue>(
    () => ({
      flattenedData,
      prs,
      loading,
      prProgress,
      insights,
      flags,
      hasFetched,
      isDbReady,
      error,
      fetch,
      addInsights,
      resetInsights,
    }),
    [
      flattenedData,
      prs,
      loading,
      prProgress,
      insights,
      flags,
      hasFetched,
      isDbReady,
      error,
      fetch,
      addInsights,
      resetInsights,
    ]
  );

  return (
    <RepoDataContext.Provider value={value}>
      {children}
    </RepoDataContext.Provider>
  );
}

export const useRepoData = (): RepoDataValue => {
  const ctx = useContext(RepoDataContext);
  if (!ctx) {
    throw new Error("useRepoData must be used within a RepoDataProvider");
  }
  return ctx;
};
