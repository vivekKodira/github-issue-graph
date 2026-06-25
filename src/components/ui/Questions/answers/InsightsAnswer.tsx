import { Box } from "@chakra-ui/react";
import { Insights } from "@/components/ui/ECharts/Insights";
import { SprintVelocityChart } from "@/components/ui/ECharts/SprintVelocityChart";
import { EffortPredictionChart } from "@/components/ui/ECharts/EffortPredictionChart";
import { AssigneeLineCharts } from "@/components/ui/ECharts/AssigneeLineCharts";
import { ReviewerLineCharts } from "@/components/ui/ECharts/ReviewerLineCharts";
import { AuthorLineCharts } from "@/components/ui/ECharts/AuthorLineCharts";
import { useRepoData } from "@/context/RepoDataContext";

interface InsightsAnswerProps {
  flattenedData: Record<string, unknown>[] | null;
  prs: Record<string, unknown>[];
  plannedEffortForProject?: number;
  plannedEndDate?: string;
  styleOptions: { width: string; height: string };
  onInsightsGenerated?: (insights: unknown[]) => void;
}

/**
 * H1 — "What should I pay attention to right now?" Shows the Insights
 * aggregator. Because insights are emitted by individual charts as they
 * compute, we mount the insight-generating charts offscreen so the summary
 * stays populated even when this answer is opened standalone.
 *
 * (Phase 6 may replace this with eager post-fetch insight computation.)
 */
export function InsightsAnswer({
  flattenedData,
  prs,
  plannedEffortForProject,
  plannedEndDate,
  styleOptions,
  onInsightsGenerated,
}: InsightsAnswerProps) {
  const { insights } = useRepoData();

  return (
    <Box>
      <Insights insights={insights} />

      {/* Offscreen (but laid out) so the charts initialize and emit insights. */}
      <Box
        position="absolute"
        left="-10000px"
        top="0"
        width="1000px"
        aria-hidden
        pointerEvents="none"
      >
        <SprintVelocityChart
          flattenedData={flattenedData}
          styleOptions={styleOptions}
          onInsightsGenerated={onInsightsGenerated}
        />
        <EffortPredictionChart
          flattenedData={flattenedData}
          styleOptions={styleOptions}
          onInsightsGenerated={onInsightsGenerated}
          plannedEffortForProject={plannedEffortForProject}
          plannedEndDate={plannedEndDate}
        />
        <AssigneeLineCharts
          flattenedData={flattenedData}
          styleOptions={styleOptions}
          searchTerm=""
          onInsightsGenerated={onInsightsGenerated}
        />
        <ReviewerLineCharts
          flattenedData={prs}
          styleOptions={styleOptions}
          searchTerm=""
          onInsightsGenerated={onInsightsGenerated}
        />
        <AuthorLineCharts
          flattenedData={prs}
          styleOptions={styleOptions}
          searchTerm=""
          onInsightsGenerated={onInsightsGenerated}
        />
      </Box>
    </Box>
  );
}
