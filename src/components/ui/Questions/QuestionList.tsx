import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Input,
  SimpleGrid,
  Text,
  VStack,
  Badge,
  HStack,
} from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip";
import { RepoHeader } from "@/components/ui/Questions/RepoHeader";
import {
  QUESTION_CATEGORIES,
  QUESTIONS,
  getQuestion,
  getQuestionAvailability,
  questionMatchesSearch,
  type Question,
} from "@/config/questions";
import { getLastQuestion } from "@/util/answerHash";
import type { DataFlags } from "@/context/RepoDataContext";

interface QuestionListProps {
  flags: DataFlags;
  repoLabel: string;
  onSelect: (id: string) => void;
  onChangeRepo: () => void;
}

const FEATURED_ID = "H1";

function QuestionCard({
  question,
  flags,
  onSelect,
  featured = false,
}: {
  question: Question;
  flags: DataFlags;
  onSelect: (id: string) => void;
  featured?: boolean;
}) {
  const availability = getQuestionAvailability(question, flags);
  const { enabled, reason, note } = availability;

  const card = (
    <Box
      role="button"
      tabIndex={enabled ? 0 : -1}
      aria-disabled={!enabled}
      onClick={() => enabled && onSelect(question.id)}
      onKeyDown={(e) => {
        if (enabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(question.id);
        }
      }}
      p={5}
      height="100%"
      borderWidth="1px"
      borderRadius="lg"
      bg={featured ? "blue.50" : undefined}
      borderColor={featured ? "blue.200" : undefined}
      cursor={enabled ? "pointer" : "not-allowed"}
      opacity={enabled ? 1 : 0.55}
      transition="border-color 0.15s, box-shadow 0.15s, transform 0.15s"
      _hover={enabled ? { borderColor: "blue.400", boxShadow: "sm" } : undefined}
    >
      <VStack align="stretch" gap={2}>
        <HStack justify="space-between" align="start">
          <Heading size="sm" lineHeight="1.3">
            {question.title}
          </Heading>
          {featured && (
            <Badge colorPalette="blue" flexShrink={0}>
              Start here
            </Badge>
          )}
        </HStack>
        <Text fontSize="sm" color="fg.muted">
          {question.description}
        </Text>
        <HStack gap={2}>
          {!enabled && reason && (
            <Badge colorPalette="gray" variant="subtle">
              {reason}
            </Badge>
          )}
          {enabled && note && (
            <Badge colorPalette="purple" variant="subtle">
              {note}
            </Badge>
          )}
        </HStack>
      </VStack>
    </Box>
  );

  if (!enabled && reason) {
    return (
      <Tooltip content={reason} showArrow>
        {card}
      </Tooltip>
    );
  }
  return card;
}

export function QuestionList({ flags, repoLabel, onSelect, onChangeRepo }: QuestionListProps) {
  const [search, setSearch] = useState("");

  const featured = getQuestion(FEATURED_ID);

  // Questions grouped by category, filtered by search, excluding the featured
  // one (it gets its own banner). Empty groups are dropped.
  const groups = useMemo(() => {
    return [...QUESTION_CATEGORIES]
      .sort((a, b) => a.order - b.order)
      .map((category) => ({
        category,
        questions: QUESTIONS.filter(
          (q) =>
            q.category === category.id &&
            q.id !== FEATURED_ID &&
            questionMatchesSearch(q, search)
        ),
      }))
      .filter((group) => group.questions.length > 0);
  }, [search]);

  const featuredVisible =
    featured && questionMatchesSearch(featured, search);
  const noResults = groups.length === 0 && !featuredVisible;

  // "Recently viewed" — last-opened question, if it still exists, isn't the
  // featured one, and is currently answerable.
  const lastId = getLastQuestion();
  const lastQuestion =
    lastId && lastId !== FEATURED_ID ? getQuestion(lastId) : undefined;
  const showLast =
    lastQuestion && getQuestionAvailability(lastQuestion, flags).enabled;

  return (
    <Box width="100%">
      <RepoHeader repoLabel={repoLabel} onChangeRepo={onChangeRepo} />

      <Box maxW="1000px" mx="auto" px={6} pb={12}>
        <VStack align="stretch" gap={6}>
          <Box>
            <Heading size="lg" mb={1}>
              What do you want to know?
            </Heading>
            <Text color="fg.muted">
              Pick a question and we'll show just the chart that answers it.
            </Text>
          </Box>

          <Input
            placeholder="Search questions…"
            aria-label="Search questions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxW="480px"
          />

          {showLast && lastQuestion && (
            <HStack gap={2} fontSize="sm" color="fg.muted">
              <Text>Recently viewed:</Text>
              <Button
                variant="plain"
                size="sm"
                height="auto"
                p={0}
                color="blue.500"
                onClick={() => onSelect(lastQuestion.id)}
              >
                {lastQuestion.title}
              </Button>
            </HStack>
          )}

          {featuredVisible && featured && (
            <QuestionCard
              question={featured}
              flags={flags}
              onSelect={onSelect}
              featured
            />
          )}

          {noResults && (
            <Text color="fg.muted">No questions match “{search}”.</Text>
          )}

          {groups.map(({ category, questions }) => (
            <Box key={category.id}>
              <Heading size="md" mb={3} color="fg.muted">
                {category.label}
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {questions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    flags={flags}
                    onSelect={onSelect}
                  />
                ))}
              </SimpleGrid>
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
  );
}
