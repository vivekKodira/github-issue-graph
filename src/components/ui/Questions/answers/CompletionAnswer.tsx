import { useMemo } from "react";
import { Box, SimpleGrid } from "@chakra-ui/react";
import { CompletionChart } from "@/components/ui/ECharts/CompletionChart";
import { useProjectKeys } from "@/context/ProjectKeysContext";
import {
  fetchPlannedTaskCompletedCount,
  fetchPlannedTaskCompletedData,
  fetchoverAllCompletedData,
} from "@/util/completionMetrics";

interface CompletionAnswerProps {
  flattenedData: Record<string, unknown>[] | null;
  plannedEffortForProject?: number;
  styleOptions: { width: string; height: string };
}

/**
 * A1 — "How much of the work is done?" Renders the three completion gauges
 * together (count / planned effort / overall) since they answer one question.
 * Reads the project-key mapping itself so the registry stays decoupled from it.
 */
export function CompletionAnswer({
  flattenedData,
  plannedEffortForProject = 0,
  styleOptions,
}: CompletionAnswerProps) {
  const { projectKeys } = useProjectKeys();

  const metrics = useMemo(() => {
    const data = flattenedData ?? [];
    if (!data.length) return { count: 0, planned: -1, overall: -1 };
    return {
      count: fetchPlannedTaskCompletedCount(data),
      planned: fetchPlannedTaskCompletedData(data, projectKeys),
      overall: fetchoverAllCompletedData(data, plannedEffortForProject, projectKeys),
    };
  }, [flattenedData, projectKeys, plannedEffortForProject]);

  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
      <Box>
        <CompletionChart
          title="Planned Task Completion Count"
          data={metrics.count}
          styleOptions={styleOptions}
        />
      </Box>
      {metrics.planned !== -1 && (
        <Box>
          <CompletionChart
            title="Planned Task Completion Effort"
            data={metrics.planned}
            styleOptions={styleOptions}
          />
        </Box>
      )}
      {metrics.overall !== -1 && (
        <Box>
          <CompletionChart
            title="Overall Task Completion"
            data={metrics.overall}
            styleOptions={styleOptions}
          />
        </Box>
      )}
    </SimpleGrid>
  );
}
