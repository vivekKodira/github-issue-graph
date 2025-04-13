import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';

interface AssigneeInsight {
  text: string;
  severity: number;
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

  useEffect(() => {
    if (!flattenedData?.length) {
      setChartOptionsArray([]);
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
          // Calculate severity based on percentage decrease
          const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20))); // -1 to -5 based on 20% intervals
          insights.push({
            text: `${series.name}'s task efforts decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint}`,
            severity
          });
        }
        
        else if (currentValue > previousValue) {
          const increase = ((currentValue - previousValue) / previousValue * 100).toFixed(1);
          // Calculate severity based on percentage decrease
          const severity = Math.min(5, Math.max(1, Math.floor(Number(increase) / 20))); // -1 to -5 based on 20% intervals
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

    // Create options for all assignees chart
    const allAssigneesOptions = {
      title: {
        text: "All Assignees Tasks per Sprint",
        left: "center",
        top: 0,
        textStyle: {
          color: '#ffffff'
        }
      },
      tooltip: {
        trigger: "axis",
      },
      legend: {
        data: filteredAssigneeSeries.map(s => s.name),
        textStyle: {
          color: '#ffffff'
        },
        top: 30,
        left: 'center'
      },
      grid: {
        top: 80,  // Add more space at the top for title and legend
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: sprints,
      },
      yAxis: {
        type: "value",
        name:  "Task Value",
      },
      series: filteredAssigneeSeries,  // Only include filtered assignee series
    };

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

    setChartOptionsArray([allAssigneesOptions, ...individualCharts]);
  }, [flattenedData, projectKeys, searchTerm, onInsightsGenerated, previousInsights]);

  return (
    <>
      {chartOptionsArray.map((options, index) => (
        <div key={index}>
          <ECharts option={options} style={styleOptions} />
        </div>
      ))}
    </>
  );
}; 