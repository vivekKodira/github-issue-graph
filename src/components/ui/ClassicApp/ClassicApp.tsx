import RepoConfiguration from "@/components/ui/RepoConfiguration/RepoConfiguration";
import { ProjectDashboard } from "@/components/ui/ProjectDashboard/ProjectDashboard";
import type { RepoConfig } from "@/context/RepoDataContext";

interface ClassicAppProps {
  config: RepoConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addConfiguration: (cfg: any) => Promise<void> | void;
}

/**
 * The legacy 5-tab dashboard, reachable only behind the `classic_dashboard`
 * flag. Isolated into its own module so it (and the ~24 charts it statically
 * imports) is lazy-loaded — keeping the default question-driven flow's bundle
 * lean and letting the per-answer charts code-split (Phase 6).
 */
export default function ClassicApp({ config, addConfiguration }: ClassicAppProps) {
  return (
    <>
      <RepoConfiguration
        repoOwner={config.repoOwner}
        repository={config.repository}
        project={config.project}
        githubToken={config.githubToken}
        openaiApiKey={config.openaiApiKey ?? ""}
        plannedEffortForProject={config.plannedEffortForProject ?? 0}
        plannedEndDate={config.plannedEndDate ?? ""}
        addConfiguration={addConfiguration}
      />
      <ProjectDashboard
        repoOwner={config.repoOwner}
        project={config.project}
        repository={config.repository}
        githubToken={config.githubToken}
        openaiApiKey={config.openaiApiKey ?? ""}
        plannedEffortForProject={config.plannedEffortForProject ?? 0}
        plannedEndDate={config.plannedEndDate ?? ""}
      />
    </>
  );
}
