import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { Box, Table, Stack } from "@chakra-ui/react";

interface AssigneeInsight {
  text: string;
  severity: number;
}

interface Task {
  title: string;
  sprint: string;
  effort: number;
}

interface AssigneeData {
  assignee: string;
  tasks: Task[];
}

export const createLineChartData = (tasks, projectKeys) => {
  const sprintData = {};
  const assigneeData = {};

  // Initialize data structures
  tasks.forEach((task) => {
    if (task.Status !== "Done") {
      return; // Skip incomplete tasks
    }

    const sprint = task[projectKeys[PROJECT_KEYS.SPRINT].value];
    if (!sprint) {
      return; // Skip tasks with no sprint
    }

    // Get task weight based on actual days or estimate days
    const actualDays = task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value];
    const estimateDays = task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value];
    const weight = actualDays || estimateDays || 1; // Default to 1 if neither is available

    // Process assignees
    const taskAssignees = task.assignees && task.assignees.length > 0
      ? task.assignees
      : null;  // Skip unassigned tasks

    if (!taskAssignees) return;  // Skip if no assignees

    taskAssignees.forEach((assignee) => {
      if (!sprintData[sprint]) {
        sprintData[sprint] = {};
      }
      if (!sprintData[sprint][assignee]) {
        sprintData[sprint][assignee] = 0;
      }
      sprintData[sprint][assignee] += weight;
      assigneeData[assignee] = true;
    });
  });

  // Sort sprints
  const sprints = Object.keys(sprintData).sort();
  const assignees = Object.keys(assigneeData);

  // Create series data for all assignees
  const allAssigneesSeries = {
    name: "All Assignees",
    type: "line",
    data: sprints.map((sprint) => {
      return Object.values(sprintData[sprint]).reduce((sum: number, val: number) => sum + val, 0);
    }),
  };

  // Create series data for each assignee
  const assigneeSeries = assignees.map((assignee) => ({
    name: assignee,
    type: "line",
    data: sprints.map((sprint) => sprintData[sprint][assignee] || 0),
  }));

  return {
    sprints,
    allAssigneesSeries,
    assigneeSeries,
  };
};

export const AssigneeLineCharts = ({ flattenedData, styleOptions, searchTerm, onInsightsGenerated }) => {
  const { projectKeys } = useProjectKeys();
  const [chartOptionsArray, setChartOptionsArray] = useState([]);
  const [previousInsights, setPreviousInsights] = useState<AssigneeInsight[]>([]);
  const [tableData, setTableData] = useState<AssigneeData[]>([]);
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
  const [selectedSprints, setSelectedSprints] = useState<Record<string, string>>({});
  const pageSize = 10;

  useEffect(() => {
    if (!flattenedData?.length) {
      setChartOptionsArray([]);
      setTableData([]);
      if (onInsightsGenerated) {
        onInsightsGenerated([]);
      }
      return;
    }

    const { sprints, assigneeSeries } = createLineChartData(flattenedData, projectKeys);
    
    // Generate insights from chart data
    const insights: AssigneeInsight[] = [];
    assigneeSeries.forEach(series => {
      const data = series.data;
      if (data.length >= 2) {
        const currentValue = data[data.length - 1];
        const previousValue = data[data.length - 2];
        const currentSprint = sprints[sprints.length - 1];
        const previousSprint = sprints[sprints.length - 2];

        if (currentValue < previousValue) {
          const decrease = ((previousValue - currentValue) / previousValue * 100).toFixed(1);
          const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20)));
          insights.push({
            text: `${series.name}'s task efforts decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint}`,
            severity
          });
        }
        
        else if (currentValue > previousValue) {
          const increase = ((currentValue - previousValue) / previousValue * 100).toFixed(1);
          const severity = Math.min(5, Math.max(1, Math.floor(Number(increase) / 20)));
          insights.push({
            text: `${series.name}'s task efforts increased by ${increase}% in ${currentSprint} compared to ${previousSprint}`,
            severity
          });
        }
      }
    });

    // Only update insights if they've changed
    if (onInsightsGenerated && JSON.stringify(insights) !== JSON.stringify(previousInsights)) {
      onInsightsGenerated(insights);
      setPreviousInsights(insights);
    }

    // Filter assignee series based on search term
    const filteredAssigneeSeries = searchTerm
      ? assigneeSeries.filter(series => 
          series.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : assigneeSeries;

    // Create table data for each assignee
    const assigneeTableData = filteredAssigneeSeries.map(series => {
      const tasks = flattenedData.filter(task => {
        const taskAssignees = task.assignees && task.assignees.length > 0
          ? task.assignees
          : null;
        return taskAssignees && taskAssignees.includes(series.name);
      });

      return {
        assignee: series.name,
        tasks: tasks.map(task => ({
          title: task.title,
          sprint: task[projectKeys[PROJECT_KEYS.SPRINT].value],
          effort: task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value] || 0
        }))
      };
    });

    setTableData(assigneeTableData);

    // Create options for individual assignee charts
    const individualCharts = filteredAssigneeSeries.map((series) => ({
      title: {
        text: `Tasks per Sprint - ${series.name}`,
        left: "center",
        textStyle: {
          color: '#ffffff'
        }
      },
      tooltip: {
        trigger: "axis",
      },
      xAxis: {
        type: "category",
        data: sprints,
      },
      yAxis: {
        type: "value",
        name: "Task Value",
      },
      series: [series],
    }));

    setChartOptionsArray(individualCharts);
  }, [flattenedData, projectKeys, searchTerm, onInsightsGenerated, previousInsights]);

  const handlePageChange = (assignee: string, page: number) => {
    setCurrentPages(prev => ({ ...prev, [assignee]: page }));
  };

  const handleSprintChange = (assignee: string, sprint: string) => {
    setSelectedSprints(prev => ({ ...prev, [assignee]: sprint }));
  };

  return (
    <Stack gap={4}>
      {chartOptionsArray.map((options, index) => {
        const assigneeData = tableData[index];
        const currentPage = currentPages[assigneeData.assignee] || 1;
        const selectedSprint = selectedSprints[assigneeData.assignee] || 'all';
        
        // Filter tasks by selected sprint
        const filteredTasks = selectedSprint === 'all' 
          ? assigneeData.tasks 
          : assigneeData.tasks.filter(task => task.sprint === selectedSprint);

        // Get unique sprints for the filter dropdown
        const uniqueSprints = [...new Set(assigneeData.tasks.map(task => task.sprint))].sort();

        // Calculate pagination
        const totalPages = Math.ceil(filteredTasks.length / pageSize);
        const paginatedTasks = filteredTasks.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize
        );

        return (
          <Stack key={index} direction="row" gap={4} align="start">
            <Box flex="1">
              <ECharts option={options} style={styleOptions} />
            </Box>
            <Box flex="1">
              <Stack gap={2}>
                <select
                  value={selectedSprint}
                  onChange={(e) => handleSprintChange(assigneeData.assignee, e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px' }}
                >
                  <option value="all">All Sprints</option>
                  {uniqueSprints.map(sprint => (
                    <option key={sprint} value={sprint}>{sprint}</option>
                  ))}
                </select>
                <Table.Root size="sm" variant="outline">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Task Title</Table.ColumnHeader>
                      <Table.ColumnHeader>Sprint</Table.ColumnHeader>
                      <Table.ColumnHeader>Effort (days)</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {paginatedTasks.map((task, taskIndex) => (
                      <Table.Row key={taskIndex}>
                        <Table.Cell>{task.title}</Table.Cell>
                        <Table.Cell>{task.sprint}</Table.Cell>
                        <Table.Cell>{task.effort}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handlePageChange(assigneeData.assignee, currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{ padding: '4px 8px' }}
                  >
                    Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => handlePageChange(assigneeData.assignee, currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{ padding: '4px 8px' }}
                  >
                    Next
                  </button>
                </div>
              </Stack>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}; 