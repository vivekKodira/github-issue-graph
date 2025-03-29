import { useState } from "react";
import { Stack, Box, Wrap, Button, Input, Field } from "@chakra-ui/react";
import fetchProjectDetails from "./github-project-status";
import { StatusChart } from "@/components/ui/ECharts.tsx/StatusChart.tsx";
import { SprintChart } from "@/components/ui/ECharts.tsx/SprintChart.tsx";
import { CompletionChart } from "@/components/ui/ECharts.tsx/CompletionChart.tsx";
import { AssigneeChart } from "@/components/ui/ECharts.tsx/AssigneeChart.tsx";
import "./ProjectDashboard.css";

const fetchPlannedTaskCompletedCount = (tasks) => {
  const completedTasks = tasks.filter((task) => task.Status === "Done");
  return completedTasks.length / tasks.length;
};

const fetchPlannedTaskCompletedData = (tasks) => {
  const completedTasks = tasks.filter((task) => task.Status === "Done");
  const totalEffort = completedTasks.reduce((sum, task) => {
    return sum + (task["Actual (days)"] || 0); 
  }, 0);

  const totalPlannedEffort = tasks.reduce((sum, task) => {
    return sum + (task["Estimate (days)"] || 0); 
  }, 0);

  if(totalPlannedEffort == 0) {
    return -1;
  }
  return totalEffort / totalPlannedEffort;
};

const fetchoverAllCompletedData = (tasks, plannedEffortForProject) => {
  const completedTasks = tasks.filter((task) => task.Status === "Done");
  const totalEffort = completedTasks.reduce((sum, task) => {
    return sum + (task["Actual (days)"] || 0); 
  }, 0);
    if(plannedEffortForProject == 0) {
      return -1;
    }
  return totalEffort / plannedEffortForProject;
};

export const ProjectDashboard = ({ repoOwner, project, repository, githubToken }) => {
  const [loading, setLoading] = useState(false);
  const [flattenedData, setFlattenedData] = useState(null);
  const [plannedEffortForProject, setPlannedEffortForProject] = useState(0);
  const isButtonDisabled = !repoOwner ||(!repository && !project) || !githubToken;

  const [plannedTaskCompletionData, setPlannedTaskCompletionData ] = useState(0);
  const [overallTaskCompletionData, setOverallTaskCompletionData ] = useState(0);

  const styleOptions = {
    width: "100%",
    height: "500px",
  };
  const handleClick = async () => {
    setLoading(true);
    const flattenedTasks = await fetchProjectDetails({
      projectID: project,
      repoOwner: repoOwner,
      repository: repository,
      githubToken: githubToken,
    });
    console.log("flattenedTasks", flattenedTasks);
    setFlattenedData(flattenedTasks);
    setPlannedTaskCompletionData(fetchPlannedTaskCompletedData(flattenedTasks))
    setOverallTaskCompletionData(fetchoverAllCompletedData(flattenedTasks, plannedEffortForProject))
    setLoading(false);
  };

  const handleNumberChange = (event) => {
    let value: number|string = plannedEffortForProject;
    try { 
      if(event.target.value != "") {
        value= parseInt(event.target.value)
      }
    }catch(e) {
      console.error("Invalid input", e);
      value = plannedEffortForProject;
    }
    setPlannedEffortForProject(value);
  };

  return (
    <>
    <Stack direction="row">
      <Field.Root>
        <Field.Label>
          Total Planned Effort (days)<Field.RequiredIndicator />
        </Field.Label>
        <Input
          placeholder=""
          value={`${plannedEffortForProject}`}
          onChange={handleNumberChange}
        />
      </Field.Root>
      <Button
        disabled={isButtonDisabled}
        id="render-graph"
        loading={loading}
        colorPalette="gray"
        variant="outline"
        onClick={handleClick}
      >
        Render
      </Button>
    </Stack>
      <div className="projectDashboard">
        {flattenedData && (
          <Wrap>
            <Box>
              <CompletionChart
                title="Planned Task Completion Count"
                data={fetchPlannedTaskCompletedCount(flattenedData)}
                styleOptions={styleOptions}
              />
            </Box>
            {plannedTaskCompletionData!=-1 && (
              <Box>
                <CompletionChart
                  title="Planned Task Completion Effort"
                  data={plannedTaskCompletionData}
                  styleOptions={styleOptions}
                />
              </Box>
            )} 
            {overallTaskCompletionData!=-1 && (
            <Box>
              <CompletionChart
                title="Overall Task Completion"
                data={overallTaskCompletionData}
                styleOptions={styleOptions}
              />
            </Box>
            )}
            
            
            <Box>
              <StatusChart
                flattenedData={flattenedData}
                styleOptions={styleOptions}
              />
            </Box>

            <Box>
              <AssigneeChart
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
          </Wrap>
        )}
      </div>
    </>
  );
};
