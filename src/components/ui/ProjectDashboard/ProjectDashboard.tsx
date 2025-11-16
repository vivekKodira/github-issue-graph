import { useState, useCallback, useRef, useMemo, useEffect } from "react";
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
import { useRxDB } from "@/context/RxDBContext";
import { bulkInsertTasks, bulkInsertPRs, taskFromRxDBFormat, prFromRxDBFormat, destroyDatabase } from "@/db/rxdb";
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
import { PROJECT_KEYS } from "@/config/projectKeys";
import { useProjectKeys } from "@/context/ProjectKeysContext";
import { ReviewerPieCharts } from "../ECharts/ReviewerPieCharts";
import { ReviewerLineCharts } from "../ECharts/ReviewerLineCharts";
import { AuthorLineCharts } from "../ECharts/AuthorLineCharts";
import { Insights } from "../ECharts/Insights";
import { EffortPredictionChart } from "../ECharts/EffortPredictionChart";
import { IssueAnalysisDashboardV2 } from "../ECharts/IssueAnalysisDashboardV2";
import { RCAWordCloudChart } from "../ECharts/RCAWordCloudChart";

// Debug flag - controlled by localStorage
// To enable: Open browser console and run: localStorage.setItem('ENABLE_DEBUG', 'true')
// To disable: localStorage.removeItem('ENABLE_DEBUG')
const ENABLE_DEBUG = () => localStorage.getItem('ENABLE_DEBUG') === 'true';

const debugDownloadData = (data: unknown[], filename: string) => {
  if (!ENABLE_DEBUG()) return;
  
  console.log(`Debug: ${filename} (first item):`, data[0]);
  console.log(`Debug: All fields in first item:`, Object.keys(data[0] || {}));
  
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

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
  severity: number;
}

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
  const { db, isReady: isDbReady } = useRxDB();
  const [loading, setLoading] = useState(false);
  const [flattenedData, setFlattenedData] = useState(null);
  const [prs, setPRs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [insights, setInsights] = useState<Insight[]>([]);
  const insightsRef = useRef<Insight[]>([]);
  const isButtonDisabled =
    !repoOwner || (!repository && !project) || !githubToken || !isDbReady;

  const [plannedTaskCompletionData, setPlannedTaskCompletionData] = useState(0);
  const [overallTaskCompletionData, setOverallTaskCompletionData] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  const styleOptions = useMemo(() => ({
    width: "100%",
    height: "500px",
  }), []);

  const handleClick = async () => {
    if (!isDbReady) {
      console.error('Database is not ready');
      return;
    }

    setLoading(true);
    try {
      // Clear insights before fetching new data
      setInsights([]);
      insightsRef.current = [];

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

      // Store tasks in RxDB
      if (flattenedTasks && flattenedTasks.length > 0) {
        debugDownloadData(flattenedTasks, 'flattened_tasks_debug.json');
        
        await bulkInsertTasks(flattenedTasks);
        
        // Update state for immediate use (the RxDB subscription will also update it)
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

      // Store PRs in RxDB
      if (fetchedPRs && fetchedPRs.length > 0) {
        await bulkInsertPRs(fetchedPRs);
        
        // Update state for immediate use
        console.log('PRs data fetched and stored, updating state');
        setPRs(fetchedPRs);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to RxDB data changes
  useEffect(() => {
    if (!db || !isDbReady) return;

    // Subscribe to tasks
    const tasksSubscription = db.tasks
      .find()
      .sort({ updatedAt: 'desc' })
      .$
      .subscribe((docs) => {
        if (docs.length > 0) {
          const tasks = docs.map(taskFromRxDBFormat);
          setFlattenedData(tasks);
          setPlannedTaskCompletionData(
            fetchPlannedTaskCompletedData(tasks, projectKeys)
          );
          setOverallTaskCompletionData(
            fetchoverAllCompletedData(
              tasks,
              plannedEffortForProject,
              projectKeys
            )
          );
        }
      });

    // Subscribe to PRs
    const prsSubscription = db.prs
      .find()
      .sort({ updatedAt: 'desc' })
      .$
      .subscribe((docs) => {
        if (docs.length > 0) {
          const prData = docs.map(prFromRxDBFormat);
          setPRs(prData);
        }
      });

    return () => {
      tasksSubscription.unsubscribe();
      prsSubscription.unsubscribe();
    };
  }, [db, isDbReady, projectKeys, plannedEffortForProject]);

  const handleInsightsGenerated = useCallback((newInsights: Insight[]) => {
    // Ensure all insights have the required severity property
    const validInsights = newInsights.map(insight => ({
      ...insight,
      severity: insight.severity || 0 // Default to neutral if not provided
    }));

    // Update insights immediately
    setInsights(prevInsights => {
      // Filter out any insights that are already in the current insights
      const uniqueNewInsights = validInsights.filter(newInsight => 
        !prevInsights.some(existingInsight => 
          existingInsight.text === newInsight.text
        )
      );
      
      return [...prevInsights, ...uniqueNewInsights];
    });
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
              <Box p={6} borderRadius="lg" borderWidth="1px" mb={6}>
                {/* Using V2 Dashboard with Advanced Mango Query Support */}
                <IssueAnalysisDashboardV2
                  flattenedData={flattenedData}
                  styleOptions={styleOptions}
                />
              </Box>
              <Box p={6} borderRadius="lg" borderWidth="1px" mb={6}>
                <RCAWordCloudChart 
                  issues={flattenedData} 
                  styleOptions={styleOptions}
                  openaiApiKey={openaiApiKey}
                />
              </Box>
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
