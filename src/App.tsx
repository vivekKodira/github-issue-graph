import "./App.css";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ProjectDashboard } from "@/components/ui/ProjectDashboard/ProjectDashboard";
import RepoConfiguration from "@/components/ui/RepoConfiguration/RepoConfiguration";
import { ProjectKeysProvider } from "@/context/ProjectKeysContext";

function App() {
  const [repoOwner, setRepoOwner] = useState("");
  const [repository, setRepository] = useState("");
  const [project, setProject] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [plannedEffortForProject, setPlannedEffortForProject] = useState(0);
  const [plannedEndDate, setPlannedEndDate] = useState("");

  useEffect(() => {
    setRepoOwner(localStorage.getItem("repoOwner") || "");
    setRepository(localStorage.getItem("repository") || "");
    setGithubToken(localStorage.getItem("githubToken") || "");
    setOpenaiApiKey(localStorage.getItem("openaiApiKey") || "");
    setProject(localStorage.getItem("project") || "");
    setPlannedEffortForProject(Number(localStorage.getItem("plannedEffortForProject")) || 0);
    setPlannedEndDate(localStorage.getItem("plannedEndDate") || "");
  },[]);

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

  return (
    <ProjectKeysProvider>
      <Toaster />
      <RepoConfiguration
        repoOwner={repoOwner}
        repository={repository}
        project={project}
        githubToken={githubToken}
        openaiApiKey={openaiApiKey}
        plannedEffortForProject={plannedEffortForProject}
        plannedEndDate={plannedEndDate}
        addConfiguration={addConfiguration}
      />
      <ProjectDashboard
        repoOwner={repoOwner}
        project={project}
        repository={repository}
        githubToken={githubToken}
        openaiApiKey={openaiApiKey}
        plannedEffortForProject={plannedEffortForProject}
        plannedEndDate={plannedEndDate}
      />
    </ProjectKeysProvider>
  );
}

export default App;
