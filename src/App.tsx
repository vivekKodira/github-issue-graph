import "./App.css";
import { useState, useEffect } from "react";

import { Tabs } from "@chakra-ui/react";
import { Toaster } from "@/components/ui/toaster";
import { IssueGraph } from "@/components/ui/IssueGraph/IssueGraph";
import { ProjectDashboard } from "@/components/ui/ProjectDashboard/ProjectDashboard";
import RepoConfiguration from "@/components/ui/RepoConfiguration/RepoConfiguration";

function App() {
  
  const [repoOwner, setRepoOwner] = useState("");
  const [repository, setRepository] = useState("");
  const [project, setProject] = useState("");
  const [githubToken, setGithubToken] = useState("");

  useEffect(() => {
    setRepoOwner(localStorage.getItem("repoOwner") || "");
    setRepository(localStorage.getItem("repository") || "");
    setGithubToken(localStorage.getItem("githubToken") || "");
    setProject(localStorage.getItem("project") || "");
  },[]);

  const addConfiguration = async ({ repoOwner, repository, githubToken, project }) => {

    localStorage.setItem("repoOwner", repoOwner);
    localStorage.setItem("repository", repository);
    localStorage.setItem("githubToken", githubToken);
    localStorage.setItem("project", project);

    setRepoOwner(repoOwner);
    setRepository(repository);
    setGithubToken(githubToken);
    setProject(project);

    delete localStorage.localIssuesCache;
    delete localStorage.localProjectCache;
  };

  return (
    <>
      <Toaster />
      <Tabs.Root defaultValue="configuration">
        <Tabs.List>
          <Tabs.Trigger value="configuration">Configuration</Tabs.Trigger>
          <Tabs.Trigger value="graph">Graph</Tabs.Trigger>
          {/* <Tabs.Trigger value="issues">Issues</Tabs.Trigger> */}
          <Tabs.Trigger value="project">Project</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="configuration">
          <RepoConfiguration
            repoOwner={repoOwner}
            repository={repository}
            project={project}
            githubToken={githubToken}
            addConfiguration={addConfiguration}
          />
        </Tabs.Content>
        <Tabs.Content value="graph">
          <IssueGraph 
            repoOwner={repoOwner}
            repository={repository}
            githubToken={githubToken}
           />
        </Tabs.Content>
        {/* <Tabs.Content value="issues">
          <Code>{JSON.stringify(issues, null, 2) || "No issues found"}</Code>
        </Tabs.Content> */}
        <Tabs.Content value="project">
          <ProjectDashboard
            repoOwner={repoOwner}
            project={project}
            repository={repository}
            githubToken={githubToken}
          />
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}

export default App;
