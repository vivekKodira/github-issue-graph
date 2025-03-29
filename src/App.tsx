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
  const [plannedEffortForProject, setPlannedEffortForProject] = useState(0);

  useEffect(() => {
    setRepoOwner(localStorage.getItem("repoOwner") || "");
    setRepository(localStorage.getItem("repository") || "");
    setGithubToken(localStorage.getItem("githubToken") || "");
    setProject(localStorage.getItem("project") || "");
    setPlannedEffortForProject(Number(localStorage.getItem("plannedEffortForProject")) || 0);
  },[]);

  const addConfiguration = async ({ repoOwner, repository, githubToken, project, plannedEffortForProject, projectKeys }) => {
    localStorage.setItem("repoOwner", repoOwner);
    localStorage.setItem("repository", repository);
    localStorage.setItem("githubToken", githubToken);
    localStorage.setItem("project", project);
    localStorage.setItem("plannedEffortForProject", plannedEffortForProject);
    localStorage.setItem("projectKeys", JSON.stringify(projectKeys));
    
    setRepoOwner(repoOwner);
    setRepository(repository);
    setGithubToken(githubToken);
    setProject(project);
    setPlannedEffortForProject(plannedEffortForProject);
  };

  return (
    <ProjectKeysProvider>
      <Toaster />
      <RepoConfiguration
        repoOwner={repoOwner}
        repository={repository}
        project={project}
        githubToken={githubToken}
        plannedEffortForProject={plannedEffortForProject}
        addConfiguration={addConfiguration}
      />
      <ProjectDashboard
        repoOwner={repoOwner}
        project={project}
        repository={repository}
        githubToken={githubToken}
        plannedEffortForProject={plannedEffortForProject}
      />
    </ProjectKeysProvider>
  );
}

export default App;
