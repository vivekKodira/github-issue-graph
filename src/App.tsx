import "./App.css";
import { useState, useMemo, lazy, Suspense } from "react";
import { Spinner, Box } from "@chakra-ui/react";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/ui/AppShell/AppShell";
import { ProjectKeysProvider } from "@/context/ProjectKeysContext";
import { RepoDataProvider } from "@/context/RepoDataContext";
import type { RepoConfig } from "@/context/RepoDataContext";
import { Header } from "@/components/ui/Header/Header";

// Legacy dashboard, lazy-loaded so its ~24 static chart imports stay out of the
// default bundle (only pulled in when the classic_dashboard flag is set).
const ClassicApp = lazy(() => import("@/components/ui/ClassicApp/ClassicApp"));

// Feature flag: keep the legacy 5-tab dashboard reachable during migration.
// Enable with: localStorage.setItem('classic_dashboard', 'true')
const useClassicDashboard = () =>
  localStorage.getItem("classic_dashboard") === "true";

function App() {
  // Read persisted config synchronously so the initial render (and the
  // AppShell's hash-based deep-link routing) sees the real config immediately.
  const [repoOwner, setRepoOwner] = useState(() => localStorage.getItem("repoOwner") || "");
  const [repository, setRepository] = useState(() => localStorage.getItem("repository") || "");
  const [project, setProject] = useState(() => localStorage.getItem("project") || "");
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("githubToken") || "");
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem("openaiApiKey") || "");
  const [plannedEffortForProject, setPlannedEffortForProject] = useState(
    () => Number(localStorage.getItem("plannedEffortForProject")) || 0
  );
  const [plannedEndDate, setPlannedEndDate] = useState(() => localStorage.getItem("plannedEndDate") || "");
  const [classicMode, setClassicMode] = useState(useClassicDashboard);

  const toggleClassic = () => {
    setClassicMode((prev) => {
      const next = !prev;
      localStorage.setItem("classic_dashboard", String(next));
      return next;
    });
  };

  const addConfiguration = async ({ repoOwner, repository, githubToken, openaiApiKey, project, plannedEffortForProject, plannedEndDate, projectKeys }) => {
    localStorage.setItem("repoOwner", repoOwner);
    localStorage.setItem("repository", repository);
    localStorage.setItem("githubToken", githubToken);
    localStorage.setItem("openaiApiKey", openaiApiKey);
    localStorage.setItem("project", project);
    localStorage.setItem("plannedEffortForProject", plannedEffortForProject);
    localStorage.setItem("plannedEndDate", plannedEndDate);
    localStorage.setItem("projectKeys", JSON.stringify(projectKeys));

    setRepoOwner(repoOwner);
    setRepository(repository);
    setGithubToken(githubToken);
    setOpenaiApiKey(openaiApiKey);
    setProject(project);
    setPlannedEffortForProject(plannedEffortForProject);
    setPlannedEndDate(plannedEndDate);
  };

  const config = useMemo<RepoConfig>(
    () => ({
      repoOwner,
      repository,
      project,
      githubToken,
      openaiApiKey,
      plannedEffortForProject,
      plannedEndDate,
    }),
    [repoOwner, repository, project, githubToken, openaiApiKey, plannedEffortForProject, plannedEndDate]
  );

  return (
    <ProjectKeysProvider>
      <RepoDataProvider config={config}>
        <Toaster />
        <Header classicMode={classicMode} onToggleClassic={toggleClassic} />

        {classicMode ? (
          <Suspense
            fallback={
              <Box display="flex" justifyContent="center" py={20}>
                <Spinner size="lg" />
              </Box>
            }
          >
            <ClassicApp config={config} addConfiguration={addConfiguration} />
          </Suspense>
        ) : (
          <AppShell config={config} addConfiguration={addConfiguration} />
        )}
      </RepoDataProvider>
    </ProjectKeysProvider>
  );
}

export default App;
