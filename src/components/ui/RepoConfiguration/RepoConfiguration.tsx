import { Heading, Text, Input, Stack, Button, Tabs } from "@chakra-ui/react";
import { FormControl, FormLabel, FormHelperText, FormErrorMessage } from "@chakra-ui/form-control";
import { PasswordInput } from "@/components/ui/password-input.js";
import { toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { ProjectKeyConfig } from '@/types/projectKeys';
import { PROJECT_KEY_CONFIGS } from '@/config/projectKeyConfigs';
import { useRxDB } from '@/context/RxDBContext';

function RepoConfiguration({
  repoOwner: initialRepoOwner,
  repository: initialRepository,
  project: initialProject,
  githubToken: initialGithubToken,
  openaiApiKey: initialOpenaiApiKey,
  plannedEffortForProject: initialPlannedEffortForProject,
  plannedEndDate: initialPlannedEndDate,
  addConfiguration,
}) {
  const { projectKeys, setProjectKeys } = useProjectKeys();
  const { db } = useRxDB();
  const [repoOwner, setRepoOwner] = useState(initialRepoOwner || "");
  const [repository, setRepository] = useState(initialRepository || "");
  const [project, setProject] = useState(initialProject || "");
  const [githubToken, setGithubToken] = useState(initialGithubToken || "");
  const [openaiApiKey, setOpenaiApiKey] = useState(initialOpenaiApiKey || "");
  const [plannedEffortForProject, setPlannedEffortForProject] = useState(initialPlannedEffortForProject || 0);
  const [plannedEndDate, setPlannedEndDate] = useState(initialPlannedEndDate || "");

  useEffect(() => {
    setRepoOwner(initialRepoOwner);
    setRepository(initialRepository);
    setProject(initialProject);
    setGithubToken(initialGithubToken);
    setOpenaiApiKey(initialOpenaiApiKey);
    setPlannedEffortForProject(initialPlannedEffortForProject);
    setPlannedEndDate(initialPlannedEndDate);
  }, [initialRepoOwner, initialRepository, initialProject, initialGithubToken, initialOpenaiApiKey, initialPlannedEffortForProject, initialPlannedEndDate]);

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
      plannedEndDate,
      projectKeys 
    });
  };

  const handleClearStorage = async () => {
    // List of application-specific localStorage keys to clear
    const appKeys = [
      // Configuration keys
      'repoOwner',
      'repository',
      'githubToken',
      'openaiApiKey',
      'project',
      'plannedEffortForProject',
      'plannedEndDate',
      'projectKeys',
      // Dashboard state keys
      'issueAnalysisDashboardState',
      // Demo mode
      'demo_mode',
      // Debug flag
      'ENABLE_DEBUG',
    ];
    
    // Clear configuration and state keys
    appKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear cache keys (those with pattern: cacheKey-projectID-repository)
    // Iterate through all localStorage keys to find and remove cache entries
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Match cache pattern: issues-*, prs-*
        if (key.startsWith('issues-') || key.startsWith('prs-')) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear RxDB database
    if (db) {
      try {
        await db.tasks.find().remove();
        await db.prs.find().remove();
        console.log('RxDB database cleared');
      } catch (error) {
        console.error('Error clearing RxDB database:', error);
      }
    }
    
    // Reset state
    setRepoOwner("");
    setRepository("");
    setProject("");
    setGithubToken("");
    setOpenaiApiKey("");
    setPlannedEffortForProject(0);
    setPlannedEndDate("");
    setProjectKeys(PROJECT_KEY_CONFIGS);
    
    toaster.create({
      description: "All cached data has been cleared",
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
          <Stack direction="column" mt={4} maxW="50%" mx="auto" gap={4}>
            <FormControl isRequired isInvalid={!repoOwner}>
              <FormLabel>
                Repo Owner
              </FormLabel>
              <PasswordInput
                placeholder="Repo owner"
                value={repoOwner}
                onChange={(evt) => setRepoOwner(evt.target.value)}
              />
              <FormHelperText>Enter the repository owner or organization name</FormHelperText>
              {!repoOwner && <FormErrorMessage>Repo Owner is required</FormErrorMessage>}
            </FormControl>

            <Stack direction={{ base: "column", md: "row" }} gap={4} align="center">
              <FormControl isRequired isInvalid={!repository && !project} flex="1">
                <FormLabel>
                  Repository
                </FormLabel>
                <PasswordInput
                  placeholder="Repository"
                  value={repository}
                  onChange={(evt) => setRepository(evt.target.value)}
                />
                <FormHelperText>Enter the repository name</FormHelperText>
                {!repository && !project && <FormErrorMessage>Either Repository or Project is required</FormErrorMessage>}
              </FormControl>
              <Text alignSelf="center" my={2}>or</Text>
              <FormControl flex="1">
                <FormLabel>
                  Project
                </FormLabel>
                <PasswordInput
                  placeholder="Project"
                  value={project}
                  onChange={(evt) => setProject(evt.target.value)}
                />
                <FormHelperText>Enter the project name (optional)</FormHelperText>
              </FormControl>
            </Stack>

            <FormControl isRequired isInvalid={!githubToken}>
              <FormLabel>
                Github Token
              </FormLabel>
              <PasswordInput
                placeholder="Github Token"
                value={githubToken}
                onChange={(evt) => setGithubToken(evt.target.value)}
              />
              <FormHelperText>Enter your GitHub personal access token</FormHelperText>
              {!githubToken && <FormErrorMessage>GitHub Token is required</FormErrorMessage>}
            </FormControl>

            <FormControl>
              <FormLabel>
                OpenAI API Key
              </FormLabel>
              <PasswordInput
                placeholder="OpenAI API Key"
                value={openaiApiKey}
                onChange={(evt) => setOpenaiApiKey(evt.target.value)}
              />
              <FormHelperText>Enter your OpenAI API key for enhanced word cloud processing (optional)</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>
                Planned Effort for Project (days)
              </FormLabel>
              <Input
                type="number"
                placeholder="Planned Effort for Project"
                value={plannedEffortForProject}
                onChange={(evt) => setPlannedEffortForProject(Number(evt.target.value))}
              />
              <FormHelperText>Enter the planned effort in days (optional)</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>
                Planned End Date
              </FormLabel>
              <Input
                type="date"
                value={plannedEndDate}
                onChange={(evt) => setPlannedEndDate(evt.target.value)}
              />
              <FormHelperText>Enter the planned project completion date (optional)</FormHelperText>
            </FormControl>
          </Stack>
        </Tabs.Content>

        {/* Project Keys Tab */}
        <Tabs.Content value="keys">
          <Stack direction="column" mt={4} maxW="50%" mx="auto" gap={4}>
            <Heading size="sm" mb={2}>Project Keys Configuration</Heading>
            {Object.entries(projectKeys).map(([key, config]) => (
              <FormControl key={key} w="100%" isRequired={config.required} isInvalid={config.required && !config.value}>
                <FormLabel>
                  {config.label}
                </FormLabel>
                <Input
                  type={config.type}
                  disabled={true}
                  placeholder={config.placeholder}
                  value={config.value}
                  onChange={(evt) => handleProjectKeyChange(key, evt.target.value)}
                />
                <FormHelperText>{config.placeholder}</FormHelperText>
                {config.required && !config.value && <FormErrorMessage>{config.label} is required</FormErrorMessage>}
              </FormControl>
            ))}
          </Stack>
        </Tabs.Content>
      </Tabs.Root>

      {/* Action Buttons */}
      <Stack direction={{ base: "column", md: "row" }} gap={4} mt={6} maxW="50%" mx="auto">
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