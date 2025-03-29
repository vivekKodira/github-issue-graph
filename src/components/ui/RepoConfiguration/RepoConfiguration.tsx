import { Text, Input, Stack, Button, Field } from "@chakra-ui/react";
import { PasswordInput } from "@/components/ui/password-input.js";
import { toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";

function RepoConfiguration({
  repoOwner: initialRepoOwner,
  repository: initialRepository,
  project: initialProject,
  githubToken: initialGithubToken,
  addConfiguration,
}) {
  const [repoOwner, setRepoOwner] = useState(initialRepoOwner || "");
  const [repository, setRepository] = useState(initialRepository || "");
  const [project, setProject] = useState(initialProject || "");
  const [githubToken, setGithubToken] = useState(initialGithubToken || "");

  useEffect(() => {
    setRepoOwner(initialRepoOwner);
    setRepository(initialRepository);
    setProject(initialProject);
    setGithubToken(initialGithubToken);
  }, [initialRepoOwner, initialRepository, initialProject, initialGithubToken]);

  const handleClick = () => {
    if (!repoOwner || (!repository && !project) || !githubToken) {
      toaster.create({
        description: `Please enter all required fields.`,
        type: "error",
      });
      return;
    }
    addConfiguration({ repoOwner, repository, githubToken, project });
  };

  return (
    <Stack direction="column">
      <Field.Root>
        <Field.Label>
          Repo Owner<Field.RequiredIndicator />
        </Field.Label>
        <Input
          placeholder="Repo owner"
          value={repoOwner}
          onChange={(evt) => setRepoOwner(evt.target.value)}
        />
      </Field.Root>
      <Stack direction="row">
      <Field.Root>
        <Field.Label>
          Repository<Field.RequiredIndicator />
        </Field.Label>
        <Input
          placeholder="Repository"
          value={repository}
          onChange={(evt) => setRepository(evt.target.value)}
        />
      </Field.Root>
      <Text mx={2} mt={10}>or</Text>
      <Field.Root>
        <Field.Label>
          Project<Field.RequiredIndicator />
        </Field.Label>
        <PasswordInput
          placeholder="Project"
          value={project}
          onChange={(evt) => setProject(evt.target.value)}
        />
      </Field.Root>
      </Stack>
      <Field.Root>
        <Field.Label>
          Github Token<Field.RequiredIndicator />
        </Field.Label>
        <PasswordInput
          placeholder="Github Token"
          value={githubToken}
          onChange={(evt) => setGithubToken(evt.target.value)}
        />
      </Field.Root>
      <Button
        id="submitConfiguration"
        disabled={!repoOwner || (!repository && !project) || !githubToken}
        colorScheme="gray"
        variant="outline"
        onClick={handleClick}
      >
        Save
      </Button>
    </Stack>
  );
}

export default RepoConfiguration;