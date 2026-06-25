import { Box, Button, Heading, Text, VStack, HStack, Progress, Spinner } from "@chakra-ui/react";
import { useRepoData } from "@/context/RepoDataContext";

interface FetchingStepProps {
  /** Re-run the fetch after a failure. */
  onRetry: () => void;
  /** Return to the setup screen. */
  onBack: () => void;
}

/**
 * Full-screen fetch status. Shows a spinner + PR progress bar while loading,
 * and a clear error surface with retry/back when the fetch fails.
 */
export function FetchingStep({ onRetry, onBack }: FetchingStepProps) {
  const { loading, prProgress, error } = useRepoData();

  if (error) {
    return (
      <VStack gap={5} p={12} align="center" minH="60vh" justify="center" maxW="560px" mx="auto">
        <Heading size="md">We couldn't fetch your data</Heading>
        <Box
          width="100%"
          p={4}
          borderRadius="md"
          borderWidth="1px"
          borderColor="red.300"
          bg="red.50"
          color="red.800"
          fontSize="sm"
        >
          {error}
        </Box>
        <Text color="fg.muted" fontSize="sm" textAlign="center">
          Check your repo owner, repository/Project ID, and that your GitHub token has
          read access — then try again.
        </Text>
        <HStack gap={3}>
          <Button variant="outline" onClick={onBack}>
            ← Back to setup
          </Button>
          <Button colorScheme="blue" onClick={onRetry}>
            Retry
          </Button>
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack gap={6} p={12} align="center" minH="60vh" justify="center" aria-live="polite">
      <Spinner size="xl" />
      <Heading size="md">Fetching your data…</Heading>
      <Text color="fg.muted">Loading issues and pull requests.</Text>
      {prProgress && prProgress.total > 0 && (
        <Box width="100%" maxW="400px">
          <Progress.Root value={prProgress.fetched} max={prProgress.total} min={0}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
            <Progress.Label>Fetching pull requests</Progress.Label>
            <Progress.ValueText />
          </Progress.Root>
        </Box>
      )}
      {!loading && <Text color="fg.muted">Almost there…</Text>}
    </VStack>
  );
}
