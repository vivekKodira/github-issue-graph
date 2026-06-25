import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { Box, Button, Heading, Text, HStack, VStack, Spinner } from "@chakra-ui/react";
import { RepoHeader } from "@/components/ui/Questions/RepoHeader";
import { getQuestion, type QuestionRenderContext } from "@/config/questions";
import { useRepoData, type Insight, type RepoConfig } from "@/context/RepoDataContext";

interface AnswerViewProps {
  questionId: string;
  config: RepoConfig;
  repoLabel: string;
  /** Back to the question list. */
  onBack: () => void;
  /** Back to the setup screen. */
  onChangeRepo: () => void;
}

/**
 * Renders the single chart that answers the active question. Builds the render
 * context, captures any insights the chart emits to show a plain-language
 * takeaway, and lazy-loads the chart under a Suspense boundary.
 */
export function AnswerView({ questionId, config, repoLabel, onBack, onChangeRepo }: AnswerViewProps) {
  const { flattenedData, prs, addInsights } = useRepoData();
  const question = getQuestion(questionId);
  const [localInsights, setLocalInsights] = useState<Insight[]>([]);

  // Reset captured insights when switching questions.
  useEffect(() => {
    setLocalInsights([]);
  }, [questionId]);

  const handleInsights = useCallback(
    (ins: unknown[]) => {
      const arr = (ins as Insight[]) ?? [];
      setLocalInsights((prev) => {
        const unique = arr.filter((n) => !prev.some((e) => e.text === n.text));
        return unique.length ? [...prev, ...unique] : prev;
      });
      addInsights(arr);
    },
    [addInsights]
  );

  const styleOptions = useMemo(() => ({ width: "100%", height: "500px" }), []);

  const ctx: QuestionRenderContext = useMemo(
    () => ({
      flattenedData,
      prs,
      styleOptions,
      openaiApiKey: config.openaiApiKey,
      plannedEffortForProject: config.plannedEffortForProject,
      plannedEndDate: config.plannedEndDate,
      onInsightsGenerated: handleInsights,
    }),
    [flattenedData, prs, styleOptions, config, handleInsights]
  );

  if (!question) {
    return (
      <Box width="100%">
        <RepoHeader repoLabel={repoLabel} onChangeRepo={onChangeRepo} />
        <Box maxW="900px" mx="auto" px={6} pb={12}>
          <Text color="fg.muted" mb={4}>
            That question doesn't exist.
          </Text>
          <Button onClick={onBack}>← Back to questions</Button>
        </Box>
      </Box>
    );
  }

  // Prefer the most severe emitted insight as the takeaway; fall back to the
  // question's static description.
  const topInsight = [...localInsights].sort(
    (a, b) => (b.severity ?? 0) - (a.severity ?? 0)
  )[0];
  const takeaway = topInsight?.text || question.description;

  return (
    <Box width="100%">
      <RepoHeader repoLabel={repoLabel} onChangeRepo={onChangeRepo} />

      <Box maxW="1100px" mx="auto" px={6} pb={16}>
        <Button variant="ghost" size="sm" onClick={onBack} mb={4}>
          ← Back to questions
        </Button>

        <VStack align="stretch" gap={1} mb={6}>
          <Heading size="lg">{question.title}</Heading>
          <Text color="fg.muted">{takeaway}</Text>
        </VStack>

        <Suspense
          fallback={
            <Box display="flex" justifyContent="center" py={20}>
              <Spinner size="lg" />
            </Box>
          }
        >
          {question.render(ctx)}
        </Suspense>

        <HStack mt={10} justify="flex-start">
          <Button colorScheme="blue" onClick={onBack}>
            Ask another question
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}
