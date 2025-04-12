import { useState, useCallback, useRef, useMemo } from "react";
import {
  VStack,
  Box,
  Button,
  SimpleGrid,
  Tabs,
  Input,
} from "@chakra-ui/react";
import fetchProjectDetails from "@/util/projectFetcher";
import fetchPRs from "@/util/prFetcher";
import { StatusChart } from "@/components/ui/ECharts/StatusChart";
import { SprintChart } from "@/components/ui/ECharts/SprintChart";
import { CompletionChart } from "@/components/ui/ECharts/CompletionChart";
import { AssigneeChart } from "@/components/ui/ECharts/AssigneeChart";
import { AssigneePieCharts } from "@/components/ui/ECharts/AssigneePieCharts";
import { AssigneeLineCharts } from "@/components/ui/ECharts/AssigneeLineCharts";
import "./ProjectDashboard.css";
import { PRReviewChart } from "../ECharts/PRReviewChart";
import { PRLifecycleChart } from "../ECharts/PRLifecycleChart";
import { CodeChurnChart } from "../ECharts/CodeChurnChart";
import { ReviewQualityChart } from "../ECharts/ReviewQualityChart";
import { SprintVelocityChart } from "../ECharts/SprintVelocityChart";
import { IssueGraph } from "@/components/ui/IssueGraph/IssueGraph";
import { ReviewWordCloudChart } from "../ECharts/ReviewWordCloudChart";
import { PROJECT_KEYS } from "@/config/projectKeys";
import { useProjectKeys } from "@/context/ProjectKeysContext";
import { ReviewerPieCharts } from "../ECharts/ReviewerPieCharts";
import { ReviewerLineCharts } from "../ECharts/ReviewerLineCharts";
import { AuthorLineCharts } from "../ECharts/AuthorLineCharts";
import { Insights } from "../ECharts/Insights";

const fetchPlannedTaskCompletedCount = (tasks) => {
  const completedTasks = tasks.filter((task) => task.Status === "Done");
  return completedTasks.length / tasks.length;
};

const fetchPlannedTaskCompletedData = (tasks, projectKeys) => {
  const completedTasks = tasks.filter((task) => task.Status === "Done");
  const totalEffort = completedTasks.reduce((sum, task) => {
    return sum + (task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value] || 0);
  }, 0);

  const totalPlannedEffort = tasks.reduce((sum, task) => {
    return sum + (task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value] || 0);
  }, 0);

  if (totalPlannedEffort == 0) {
    return -1;
  }
  return totalEffort / totalPlannedEffort;
};

const fetchoverAllCompletedData = (
  tasks,
  plannedEffortForProject,
  projectKeys
) => {
  const completedTasks = tasks.filter((task) => task.Status === "Done");
  const totalEffort = completedTasks.reduce((sum, task) => {
    return sum + (task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value] || 0);
  }, 0);
  if (plannedEffortForProject == 0) {
    return -1;
  }
  return totalEffort / plannedEffortForProject;
};

interface Insight {
  text: string;
  icon: React.ComponentType;
}

export const ProjectDashboard = ({
  repoOwner,
  project,
  repository,
  githubToken,
  openaiApiKey,
  plannedEffortForProject,
}) => {
  const { projectKeys } = useProjectKeys();
  const [loading, setLoading] = useState(false);
  const [flattenedData, setFlattenedData] = useState(null);
  const [prs, setPRs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [insights, setInsights] = useState<Insight[]>([]);
  const insightsRef = useRef<Insight[]>([]);
  const isButtonDisabled =
    !repoOwner || (!repository && !project) || !githubToken;

  const [plannedTaskCompletionData, setPlannedTaskCompletionData] = useState(0);
  const [overallTaskCompletionData, setOverallTaskCompletionData] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  const styleOptions = useMemo(() => ({
    width: "100%",
    height: "500px",
  }), []);

  const handleClick = async () => {
    setLoading(true);
    try {
      const [flattenedTasks, fetchedPRs] = await Promise.all([
        fetchProjectDetails({
          projectID: project,
          repoOwner: repoOwner,
          repository: repository,
          githubToken: githubToken,
        }),
        fetchPRs({
          repoOwner: repoOwner,
          repository: repository,
          githubToken: githubToken,
        })
      ]);

      // Only update states if the data has actually changed
      if (JSON.stringify(flattenedTasks) !== JSON.stringify(flattenedData)) {
        setFlattenedData(flattenedTasks);
        setPlannedTaskCompletionData(
          fetchPlannedTaskCompletedData(flattenedTasks, projectKeys)
        );
        setOverallTaskCompletionData(
          fetchoverAllCompletedData(
            flattenedTasks,
            plannedEffortForProject,
            projectKeys
          )
        );
      }

      // Only update PRs if the data has actually changed
      const currentPRsString = JSON.stringify(prs);
      const newPRsString = JSON.stringify(fetchedPRs);
      if (currentPRsString !== newPRsString) {
        console.log('PRs data changed, updating state');
        setPRs(fetchedPRs);
      } else {
        console.log('PRs data unchanged, skipping update');
      }

      setInsights([]);
      insightsRef.current = [];
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInsightsGenerated = useCallback((newInsights: Insight[]) => {
    insightsRef.current = [...insightsRef.current, ...newInsights];
    setInsights(insightsRef.current);
  }, []);

  const handleTabChange = useCallback((details: { value: string }) => {
    setActiveTab(details.value);
  }, []);

  // Memoize the PRs data to prevent unnecessary re-renders
  const memoizedPRs = useMemo(() => {
    console.log('Memoizing PRs data');
    return prs;
  }, [JSON.stringify(prs)]);

  return (
    <VStack align="stretch" width="100%">
      {/* Configuration Section */}
      <Box p={6} borderRadius="lg" borderWidth="1px">
        <Button
          disabled={isButtonDisabled}
          id="render-graph"
          loading={loading}
          colorScheme="blue"
          onClick={handleClick}
        >
          Render
        </Button>
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
              <Box p={6} borderRadius="lg" borderWidth="1px">
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
                  <Box>
                    <CompletionChart
                      title="Planned Task Completion Count"
                      data={fetchPlannedTaskCompletedCount(flattenedData)}
                      styleOptions={styleOptions}
                    />
                  </Box>
                  {plannedTaskCompletionData !== -1 && (
                    <Box>
                      <CompletionChart
                        title="Planned Task Completion Effort"
                        data={plannedTaskCompletionData}
                        styleOptions={styleOptions}
                      />
                    </Box>
                  )}
                  {overallTaskCompletionData !== -1 && (
                    <Box>
                      <CompletionChart
                        title="Overall Task Completion"
                        data={overallTaskCompletionData}
                        styleOptions={styleOptions}
                      />
                    </Box>
                  )}
                </SimpleGrid>
                <Box>
                  <SprintVelocityChart
                    flattenedData={flattenedData}
                    prs={memoizedPRs}
                    styleOptions={styleOptions}
                    onInsightsGenerated={handleInsightsGenerated}
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
              <VStack gap={6}>
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
                      prs={memoizedPRs}
                      styleOptions={styleOptions}
                      openaiApiKey={openaiApiKey}
                    />
                  </Box>
                </VStack>
              </Box>
            </Tabs.Content>

            {/* Issue Graph Tab */}
            <Tabs.Content value="issues">
              <Box p={6} borderRadius="lg" borderWidth="1px">
                <IssueGraph issues={flattenedData} prs={memoizedPRs} />
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
