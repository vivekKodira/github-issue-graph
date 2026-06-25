import { useState, useCallback, useMemo } from "react";
import {
  VStack,
  Box,
  Button,
  SimpleGrid,
  Tabs,
  Input,
  Progress,
} from "@chakra-ui/react";
import { useRxDB } from "@/context/RxDBContext";
import { useRepoData } from "@/context/RepoDataContext";
import { destroyDatabase } from "@/db/rxdb";
import { StatusChart } from "@/components/ui/ECharts/StatusChart";
import { SprintChart } from "@/components/ui/ECharts/SprintChart";
import { CompletionChart } from "@/components/ui/ECharts/CompletionChart";
import { AssigneeChart } from "@/components/ui/ECharts/AssigneeChart";
import { AssigneePieCharts } from "@/components/ui/ECharts/AssigneePieCharts";
import { AssigneeLineCharts } from "@/components/ui/ECharts/AssigneeLineCharts";
import "./ProjectDashboard.css";
import { PRReviewChart } from "../ECharts/PRReviewChart";
import { AuthorPRFrequencyChart } from "../ECharts/AuthorPRFrequencyChart";
import { AuthorPRIntervalChart } from "../ECharts/AuthorPRIntervalChart";
import { PRLifecycleChart } from "../ECharts/PRLifecycleChart";
import { CodeChurnChart } from "../ECharts/CodeChurnChart";
import { ReviewQualityChart } from "../ECharts/ReviewQualityChart";
import { SprintVelocityChart } from "../ECharts/SprintVelocityChart";
import { IssueGraph } from "@/components/ui/IssueGraph/IssueGraph";
import { ReviewWordCloudChart } from "../ECharts/ReviewWordCloudChart";
import { useProjectKeys } from "@/context/ProjectKeysContext";
import { ReviewerPieCharts } from "../ECharts/ReviewerPieCharts";
import { ReviewerLineCharts } from "../ECharts/ReviewerLineCharts";
import { AuthorLineCharts } from "../ECharts/AuthorLineCharts";
import { Insights } from "../ECharts/Insights";
import { EffortPredictionChart } from "../ECharts/EffortPredictionChart";
import { IssueAnalysisDashboardV2 } from "../ECharts/IssueAnalysisDashboardV2";
import { DateRangeFilterStrip } from "../ECharts/DateRangeFilterStrip";
import { getRenderLog } from "@/util/renderDebugLog";
import {
  fetchPlannedTaskCompletedCount,
  fetchPlannedTaskCompletedData,
  fetchoverAllCompletedData,
} from "@/util/completionMetrics";

export const ProjectDashboard = ({
  repoOwner,
  project,
  repository,
  githubToken,
  openaiApiKey,
  plannedEffortForProject,
  plannedEndDate,
}) => {
  const { projectKeys } = useProjectKeys();
  const { isReady: isDbReady } = useRxDB();
  const {
    flattenedData,
    prs,
    loading,
    prProgress,
    insights,
    fetch,
    addInsights,
  } = useRepoData();
  const [searchTerm, setSearchTerm] = useState("");
  const isButtonDisabled =
    !repoOwner || (!repository && !project) || !githubToken || !isDbReady;

  const [activeTab, setActiveTab] = useState("overview");
  const [overviewDateFilteredData, setOverviewDateFilteredData] = useState([]);

  const handleOverviewFilteredData = useCallback((filtered: unknown[]) => {
    setOverviewDateFilteredData(filtered as never[]);
  }, []);

  const overviewDataToUse = overviewDateFilteredData.length > 0 ? overviewDateFilteredData : (flattenedData ?? []);

  const overviewCompletionMetrics = useMemo(() => {
    if (!overviewDataToUse?.length) return { planned: -1, overall: -1 };
    return {
      planned: fetchPlannedTaskCompletedData(overviewDataToUse, projectKeys),
      overall: fetchoverAllCompletedData(overviewDataToUse, plannedEffortForProject, projectKeys),
    };
  }, [overviewDataToUse, projectKeys, plannedEffortForProject]);

  const styleOptions = useMemo(() => ({
    width: "100%",
    height: "500px",
  }), []);

  const handleClick = fetch;
  const handleInsightsGenerated = addInsights;

  const handleViewDebugLog = useCallback(() => {
    const log = getRenderLog();
    alert(log || "(empty)\n\nYou can also run in console:\nlocalStorage.getItem('github-issue-graph-render-log')");
  }, []);

  const handleTabChange = useCallback((details: { value: string }) => {
    setActiveTab(details.value);
  }, []);

  const handleClearDatabase = async () => {
    if (confirm('This will destroy the database and reload the page. Continue?')) {
      try {
        await destroyDatabase();
        window.location.reload();
      } catch (error) {
        console.error('Error clearing database:', error);
        alert('Error clearing database. Please close all tabs using this app and try again.');
      }
    }
  };

  // Memoize the PRs data to prevent unnecessary re-renders
  const memoizedPRs = useMemo(() => {
    console.log('Memoizing PRs data');
    return prs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prs.length]);

  return (
    <VStack align="stretch" width="100%">
      {/* Configuration Section */}
      <Box p={6} borderRadius="lg" borderWidth="1px">
        {!isDbReady && (
          <Box mb={3} p={2} borderRadius="md" bg="blue.50" color="blue.700" fontSize="sm">
            Initializing database...
          </Box>
        )}
        {loading && prProgress && (
          <Box mb={3} width="100%">
            <Progress.Root value={prProgress.fetched} max={prProgress.total} min={0}>
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
              <Progress.Label>Fetching PRs</Progress.Label>
              <Progress.ValueText />
            </Progress.Root>
          </Box>
        )}
        <Box display="flex" gap={3}>
          <Button
            disabled={isButtonDisabled}
            id="render-graph"
            loading={loading}
            colorScheme="blue"
            onClick={handleClick}
          >
            Render
          </Button>
          <Button
            colorScheme="red"
            variant="outline"
            onClick={handleClearDatabase}
          >
            Clear Database
          </Button>
          <Button
            variant="outline"
            onClick={handleViewDebugLog}
            title="View Render debug log (also in localStorage key: github-issue-graph-render-log)"
          >
            View debug log
          </Button>
        </Box>
      </Box>

      {flattenedData && (
        <Box width="100%">
          <Tabs.Root defaultValue="overview" value={activeTab} onValueChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Trigger value="overview">Project Overview</Tabs.Trigger>
              <Tabs.Trigger value="team">Team Analysis</Tabs.Trigger>
              <Tabs.Trigger value="prs">Pull Requests</Tabs.Trigger>
              <Tabs.Trigger value="issues">Issue Graph</Tabs.Trigger>
              <Tabs.Trigger value="insights">Insights</Tabs.Trigger>
            </Tabs.List>

            {/* Project Overview Tab */}
            <Tabs.Content value="overview">
              <Box p={6} borderRadius="lg" borderWidth="1px" display="flex" flexDirection="column" width="100%">
                {flattenedData?.length ? (
                  <Box flexShrink={0} width="100%" marginBottom={4}>
                    <DateRangeFilterStrip
                      data={flattenedData as Record<string, unknown>[]}
                      dateField="createdAt"
                      onFilteredData={handleOverviewFilteredData as (filtered: Record<string, unknown>[]) => void}
                      styleOptions={styleOptions}
                    />
                  </Box>
                ) : null}
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
                  <Box>
                    <CompletionChart
                      title="Planned Task Completion Count"
                      data={overviewDataToUse?.length ? fetchPlannedTaskCompletedCount(overviewDataToUse) : 0}
                      styleOptions={styleOptions}
                    />
                  </Box>
                  {overviewDataToUse?.length && overviewCompletionMetrics.planned !== -1 && (
                    <Box>
                      <CompletionChart
                        title="Planned Task Completion Effort"
                        data={overviewCompletionMetrics.planned}
                        styleOptions={styleOptions}
                      />
                    </Box>
                  )}
                  {overviewDataToUse?.length && overviewCompletionMetrics.overall !== -1 && (
                    <Box>
                      <CompletionChart
                        title="Overall Task Completion"
                        data={overviewCompletionMetrics.overall}
                        styleOptions={styleOptions}
                      />
                    </Box>
                  )}
                </SimpleGrid>
                <Box mt={6}>
                  <SprintVelocityChart
                    flattenedData={flattenedData}
                    styleOptions={styleOptions}
                    onInsightsGenerated={handleInsightsGenerated}
                  />
                </Box>
                <Box mt={6}>
                  <EffortPredictionChart
                    flattenedData={flattenedData}
                    styleOptions={styleOptions}
                    onInsightsGenerated={handleInsightsGenerated}
                    plannedEffortForProject={plannedEffortForProject}
                    plannedEndDate={plannedEndDate}
                  />
                </Box>
              </Box>

              <Box p={6} borderRadius="lg" borderWidth="1px">
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                  <Box>
                    <StatusChart
                      flattenedData={flattenedData}
                      styleOptions={styleOptions}
                    />
                  </Box>
                  <Box>
                    <SprintChart
                      flattenedData={flattenedData}
                      styleOptions={styleOptions}
                    />
                  </Box>
                </SimpleGrid>
              </Box>
            </Tabs.Content>

            {/* Team Analysis Tab */}
            <Tabs.Content value="team">
              <VStack gap={12}>
                <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
                  <Input
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    mb={4}
                    maxW="300px"
                  />
                  <AssigneeChart
                    flattenedData={flattenedData}
                    styleOptions={styleOptions}
                    searchTerm={searchTerm}
                  />
                </Box>
                <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
                  <AssigneePieCharts
                    flattenedData={flattenedData}
                    styleOptions={styleOptions}
                    searchTerm={searchTerm}
                  />
                </Box>
                <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
                  <AssigneeLineCharts
                    flattenedData={flattenedData}
                    styleOptions={styleOptions}
                    searchTerm={searchTerm}
                    onInsightsGenerated={handleInsightsGenerated}
                  />
                </Box>
                <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
                  <ReviewerPieCharts
                    flattenedData={prs}
                    styleOptions={styleOptions}
                    searchTerm={searchTerm}
                  />
                </Box>
                <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
                  <ReviewerLineCharts
                    flattenedData={prs}
                    styleOptions={styleOptions}
                    searchTerm={searchTerm}
                    onInsightsGenerated={handleInsightsGenerated}
                  />
                </Box>
                <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
                  <AuthorLineCharts
                    flattenedData={prs}
                    styleOptions={styleOptions}
                    searchTerm={searchTerm}
                    onInsightsGenerated={handleInsightsGenerated}
                  />
                </Box>
                <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
                  <AuthorPRFrequencyChart prs={memoizedPRs} styleOptions={styleOptions} />
                </Box>
                <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
                  <AuthorPRIntervalChart prs={memoizedPRs} styleOptions={styleOptions} />
                </Box>
              </VStack>
            </Tabs.Content>

            {/* Pull Requests Tab */}
            <Tabs.Content value="prs">
              <Box p={6} borderRadius="lg" borderWidth="1px">
                <VStack gap={6} align="stretch">
                  <SimpleGrid columns={{ base: 1, md: 1 }} gap={6}>
                    <PRReviewChart prs={memoizedPRs} styleOptions={styleOptions} />
                    <PRLifecycleChart prs={memoizedPRs} styleOptions={styleOptions} />
                  </SimpleGrid>
                  <SimpleGrid columns={{ base: 1, md: 1 }} gap={6}>
                    <CodeChurnChart prs={memoizedPRs} styleOptions={styleOptions} />
                    <ReviewQualityChart prs={memoizedPRs} styleOptions={styleOptions} />
                  </SimpleGrid>
                  <Box>
                    <ReviewWordCloudChart
                      prs={memoizedPRs as never[]}
                      styleOptions={styleOptions}
                      openaiApiKey={openaiApiKey}
                    />
                  </Box>
                </VStack>
              </Box>
            </Tabs.Content>

            {/* Issue Graph Tab */}
            <Tabs.Content value="issues">
              <Box p={6} borderRadius="lg" borderWidth="1px" mb={6}>
                {/* Using V2 Dashboard with Advanced Mango Query Support; RCA Word Cloud uses same filtered data */}
                <IssueAnalysisDashboardV2
                  flattenedData={flattenedData}
                  styleOptions={styleOptions}
                  openaiApiKey={openaiApiKey}
                />
              </Box>
              <Box p={6} borderRadius="lg" borderWidth="1px">
                <IssueGraph issues={flattenedData as never[]} prs={memoizedPRs as never[]} />
              </Box>
            </Tabs.Content>

            {/* Insights Tab */}
            <Tabs.Content value="insights">
              <Insights insights={insights} />
            </Tabs.Content>
          </Tabs.Root>
        </Box>
      )}
    </VStack>
  );
};
