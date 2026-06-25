import { useState, useEffect } from "react";
import { Box, Button, Heading, Text, Stack, Input, VStack, Separator } from "@chakra-ui/react";
import {
  FormControl,
  FormLabel,
  FormHelperText,
  FormErrorMessage,
} from "@chakra-ui/form-control";
import { PasswordInput } from "@/components/ui/password-input.js";
import { useProjectKeys } from "@/context/ProjectKeysContext";
import type { ProjectKeyConfig } from "@/types/projectKeys";
import type { RepoConfig } from "@/context/RepoDataContext";

interface SetupWizardProps {
  config: RepoConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addConfiguration: (cfg: any) => Promise<void> | void;
  /** Called once config is saved — transitions to the fetching step. */
  onConnect: () => void;
}

/**
 * Focused, single-purpose onboarding screen. Required fields up front
 * (owner / repo / token); everything else lives behind "Advanced options".
 * The single primary CTA persists config and triggers the fetch.
 */
export function SetupWizard({ config, addConfiguration, onConnect }: SetupWizardProps) {
  const { projectKeys, setProjectKeys } = useProjectKeys();

  const [repoOwner, setRepoOwner] = useState(config.repoOwner || "");
  const [repository, setRepository] = useState(config.repository || "");
  const [project, setProject] = useState(config.project || "");
  const [githubToken, setGithubToken] = useState(config.githubToken || "");
  const [openaiApiKey, setOpenaiApiKey] = useState(config.openaiApiKey || "");
  const [plannedEffortForProject, setPlannedEffortForProject] = useState(
    config.plannedEffortForProject || 0
  );
  const [plannedEndDate, setPlannedEndDate] = useState(config.plannedEndDate || "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [touched, setTouched] = useState(false);

  // Keep local fields in sync if the saved config changes (e.g. on "Change repo").
  useEffect(() => {
    setRepoOwner(config.repoOwner || "");
    setRepository(config.repository || "");
    setProject(config.project || "");
    setGithubToken(config.githubToken || "");
    setOpenaiApiKey(config.openaiApiKey || "");
    setPlannedEffortForProject(config.plannedEffortForProject || 0);
    setPlannedEndDate(config.plannedEndDate || "");
  }, [config]);

  const ownerMissing = !repoOwner;
  const sourceMissing = !repository && !project;
  const tokenMissing = !githubToken;
  const isValid = !ownerMissing && !sourceMissing && !tokenMissing;

  const handleProjectKeyChange = (key: string, value: string) => {
    const updatedKeys: Record<string, ProjectKeyConfig> = {
      ...projectKeys,
      [key]: { ...projectKeys[key], value },
    };
    setProjectKeys(updatedKeys);
  };

  const handleConnect = async () => {
    setTouched(true);
    if (!isValid) return;
    await addConfiguration({
      repoOwner,
      repository,
      githubToken,
      openaiApiKey,
      project,
      plannedEffortForProject,
      plannedEndDate,
      projectKeys,
    });
    onConnect();
  };

  return (
    <Box maxW="560px" mx="auto" width="100%" px={4} py={10}>
      <VStack align="stretch" gap={2} mb={8} textAlign="center">
        <Heading size="lg">Connect your GitHub project</Heading>
        <Text color="fg.muted">
          We'll fetch your issues and pull requests, then ask what you want to know.
        </Text>
      </VStack>

      <Stack direction="column" gap={5}>
        <FormControl isRequired isInvalid={touched && ownerMissing}>
          <FormLabel>Repo owner</FormLabel>
          <Input
            placeholder="e.g. facebook"
            value={repoOwner}
            onChange={(e) => setRepoOwner(e.target.value)}
            autoFocus
          />
          <FormHelperText>The owner or organization that owns the repo.</FormHelperText>
          {touched && ownerMissing && <FormErrorMessage>Repo owner is required.</FormErrorMessage>}
        </FormControl>

        <FormControl isRequired isInvalid={touched && sourceMissing}>
          <FormLabel>Repository</FormLabel>
          <Input
            placeholder="e.g. react"
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
          />
          <FormHelperText>
            The repository name. (Or set a Project ID under Advanced options.)
          </FormHelperText>
          {touched && sourceMissing && (
            <FormErrorMessage>Enter a repository or a Project ID.</FormErrorMessage>
          )}
        </FormControl>

        <FormControl isRequired isInvalid={touched && tokenMissing}>
          <FormLabel>GitHub token</FormLabel>
          <PasswordInput
            placeholder="ghp_…"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
          />
          <FormHelperText>
            A personal access token with repo read access. Stored only in your browser.
          </FormHelperText>
          {touched && tokenMissing && <FormErrorMessage>GitHub token is required.</FormErrorMessage>}
        </FormControl>

        <Box>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "− Hide advanced options" : "+ Advanced options"}
          </Button>
        </Box>

        {showAdvanced && (
          <Stack direction="column" gap={5} pl={1}>
            <FormControl>
              <FormLabel>Project ID</FormLabel>
              <Input
                placeholder="GitHub Project (v2) ID"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              />
              <FormHelperText>
                Use a Project board instead of (or alongside) a single repository.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>OpenAI API key</FormLabel>
              <PasswordInput
                placeholder="sk-…"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
              <FormHelperText>Optional — powers the AI word-cloud answers.</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Planned effort (days)</FormLabel>
              <Input
                type="number"
                placeholder="e.g. 120"
                value={plannedEffortForProject}
                onChange={(e) => setPlannedEffortForProject(Number(e.target.value))}
              />
              <FormHelperText>Optional — enables the completion-forecast answer.</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Planned end date</FormLabel>
              <Input
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
              />
              <FormHelperText>Optional — compares the forecast against a deadline.</FormHelperText>
            </FormControl>

            <Separator />

            <Box>
              <Heading size="sm" mb={1}>
                Project field mapping
              </Heading>
              <Text fontSize="sm" color="fg.muted" mb={3}>
                Map this app's logical fields to your project's actual field names.
              </Text>
              <Stack direction="column" gap={4}>
                {Object.entries(projectKeys).map(([key, cfg]) => (
                  <FormControl key={key}>
                    <FormLabel>{cfg.label}</FormLabel>
                    <Input
                      type={cfg.type}
                      placeholder={cfg.placeholder}
                      value={cfg.value}
                      onChange={(e) => handleProjectKeyChange(key, e.target.value)}
                    />
                    <FormHelperText>{cfg.placeholder}</FormHelperText>
                  </FormControl>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}

        <Button
          id="connect-and-fetch"
          colorScheme="blue"
          size="lg"
          width="100%"
          mt={2}
          onClick={handleConnect}
          disabled={touched && !isValid}
        >
          Connect &amp; Fetch
        </Button>
      </Stack>
    </Box>
  );
}
