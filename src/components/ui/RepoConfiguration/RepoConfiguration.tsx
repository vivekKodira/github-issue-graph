import {  Heading, Text, Input, Stack, Button, Field, Tabs } from "@chakra-ui/react";
import { PasswordInput } from "@/components/ui/password-input.js";
import { toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { ProjectKeyConfig } from '@/types/projectKeys';
import { PROJECT_KEY_CONFIGS } from '@/config/projectKeyConfigs';

function RepoConfiguration({
  repoOwner: initialRepoOwner,
  repository: initialRepository,
  project: initialProject,
  githubToken: initialGithubToken,
  openaiApiKey: initialOpenaiApiKey,
  plannedEffortForProject: initialPlannedEffortForProject,
  addConfiguration,
}) {
  const { projectKeys, setProjectKeys } = useProjectKeys();
  const [repoOwner, setRepoOwner] = useState(initialRepoOwner || "");
  const [repository, setRepository] = useState(initialRepository || "");
  const [project, setProject] = useState(initialProject || "");
  const [githubToken, setGithubToken] = useState(initialGithubToken || "");
  const [openaiApiKey, setOpenaiApiKey] = useState(initialOpenaiApiKey || "");
  const [plannedEffortForProject, setPlannedEffortForProject] = useState(initialPlannedEffortForProject || 0);

  useEffect(() => {
    setRepoOwner(initialRepoOwner);
    setRepository(initialRepository);
    setProject(initialProject);
    setGithubToken(initialGithubToken);
    setOpenaiApiKey(initialOpenaiApiKey);
    setPlannedEffortForProject(initialPlannedEffortForProject);
  }, [initialRepoOwner, initialRepository, initialProject, initialGithubToken, initialOpenaiApiKey, initialPlannedEffortForProject]);

  const handleProjectKeyChange = (key: string, value: string) => {
    const updatedKeys: Record<string, ProjectKeyConfig> = {
      ...projectKeys,
      [key]: {
        ...projectKeys[key],
        value
      }
    };
    setProjectKeys(updatedKeys);
  };

  const handleClick = () => {
    if (!repoOwner || (!repository && !project) || !githubToken) {
      toaster.create({
        description: `Please enter all required fields.`,
        type: "error",
      });
      return;
    }
    addConfiguration({ 
      repoOwner, 
      repository, 
      githubToken,
      openaiApiKey, 
      project, 
      plannedEffortForProject,
      projectKeys 
    });
  };

  const handleClearStorage = () => {
    localStorage.clear();
    setRepoOwner("");
    setRepository("");
    setProject("");
    setGithubToken("");
    setOpenaiApiKey("");
    setPlannedEffortForProject(0);
    setProjectKeys(PROJECT_KEY_CONFIGS);
    
    toaster.create({
      description: "All configuration data has been cleared",
      type: "success",
    });
  };

  return (
    <>
      <Heading size="md" mb={4}>Project Configuration</Heading>
      <Tabs.Root defaultValue="basic">
        <Tabs.List>
          <Tabs.Trigger value="basic">Basic Configuration</Tabs.Trigger>
          <Tabs.Trigger value="keys">Project Keys</Tabs.Trigger>
        </Tabs.List>

        {/* Basic Configuration Tab */}
        <Tabs.Content value="basic">
          <Stack direction="column" mt={4} maxW="50%" mx="auto">
            <Field.Root w="100%">
              <Field.Label>
                Repo Owner<Field.RequiredIndicator />
              </Field.Label>
              <PasswordInput
                placeholder="Repo owner"
                value={repoOwner}
                onChange={(evt) => setRepoOwner(evt.target.value)}
              />
              <Text fontSize="sm" color="gray.500" mt={1}>Enter the repository owner or organization name</Text>
            </Field.Root>
            <Stack direction="row" w="100%" gap={4}>
              <Field.Root flex="1">
                <Field.Label>
                  Repository<Field.RequiredIndicator />
                </Field.Label>
                <PasswordInput
                  placeholder="Repository"
                  value={repository}
                  onChange={(evt) => setRepository(evt.target.value)}
                />
                <Text fontSize="sm" color="gray.500" mt={1}>Enter the repository name</Text>
              </Field.Root>
              <Text alignSelf="center" my={2}>or</Text>
              <Field.Root flex="1">
                <Field.Label>
                  Project<Field.RequiredIndicator />
                </Field.Label>
                <PasswordInput
                  placeholder="Project"
                  value={project}
                  onChange={(evt) => setProject(evt.target.value)}
                />
                <Text fontSize="sm" color="gray.500" mt={1}>Enter the project name</Text>
              </Field.Root>
            </Stack>
            <Field.Root w="100%">
              <Field.Label>
                Github Token<Field.RequiredIndicator />
              </Field.Label>
              <PasswordInput
                placeholder="Github Token"
                value={githubToken}
                onChange={(evt) => setGithubToken(evt.target.value)}
              />
              <Text fontSize="sm" color="gray.500" mt={1}>Enter your GitHub personal access token</Text>
            </Field.Root>
            <Field.Root w="100%">
              <Field.Label>
                OpenAI API Key
              </Field.Label>
              <PasswordInput
                placeholder="OpenAI API Key"
                value={openaiApiKey}
                onChange={(evt) => setOpenaiApiKey(evt.target.value)}
              />
              <Text fontSize="sm" color="gray.500" mt={1}>Enter your OpenAI API key for enhanced word cloud processing</Text>
            </Field.Root>
            <Field.Root w="100%">
              <Field.Label>
                Planned Effort for Project (days)
              </Field.Label>
              <Input
                placeholder="Planned Effort for Project"
                value={plannedEffortForProject}
                onChange={(evt) => setPlannedEffortForProject(evt.target.value)}
              />
              <Text fontSize="sm" color="gray.500" mt={1}>Enter the planned effort in days</Text>
            </Field.Root>
          </Stack>
        </Tabs.Content>

        {/* Project Keys Tab */}
        <Tabs.Content value="keys">
          <Stack direction="column" mt={4} maxW="50%" mx="auto">
            <Heading size="sm" mb={2}>Project Keys Configuration</Heading>
            {Object.entries(projectKeys).map(([key, config]) => (
              <Field.Root key={key} w="100%">
                <Field.Label>
                  {config.label}{config.required && <Field.RequiredIndicator />}
                </Field.Label>
                <Input
                  type={config.type}
                  disabled={true}
                  placeholder={config.placeholder}
                  value={config.value}
                  onChange={(evt) => handleProjectKeyChange(key, evt.target.value)}
                />
                <Text fontSize="sm" color="gray.500" mt={1}>{config.placeholder}</Text>
              </Field.Root>
            ))}
          </Stack>
        </Tabs.Content>
      </Tabs.Root>

      {/* Action Buttons */}
      <Stack direction="row" gap={4} mt={6} maxW="50%" mx="auto">
        <Button
          id="submitConfiguration"
          disabled={!repoOwner || (!repository && !project) || !githubToken}
          colorScheme="gray"
          variant="outline"
          onClick={handleClick}
          flex="1"
        >
          Save
        </Button>
        <Button
          colorScheme="red"
          variant="outline"
          onClick={handleClearStorage}
          flex="1"
        >
          Clear All Data
        </Button>
      </Stack>
    </>
  );
}

export default RepoConfiguration;