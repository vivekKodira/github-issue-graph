import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { LuTrendingDown } from "react-icons/lu";

const SIZE_WEIGHTS = {
  "XS": 1,
  "S": 2,
  "M": 3,
  "L": 5,
  "XL": 8,
  "XXL": 13,
};

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

    // Get task weight based on size
    const taskSize = task[projectKeys[PROJECT_KEYS.SIZE].value] || "No Size";
    const weight = SIZE_WEIGHTS[taskSize] || 1;

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

  // Add effect for insights generation
  useEffect(() => {
    if (!flattenedData?.length) return;

    const { sprints, assigneeSeries } = createLineChartData(flattenedData, projectKeys);
    
    // Generate insights from chart data
    const insights = [];
    assigneeSeries.forEach(series => {
      const data = series.data;
      if (data.length >= 2) {
        const currentValue = data[data.length - 1];
        const previousValue = data[data.length - 2];
        const currentSprint = sprints[sprints.length - 1];
        const previousSprint = sprints[sprints.length - 2];

        if (currentValue < previousValue) {
          const decrease = ((previousValue - currentValue) / previousValue * 100).toFixed(1);
          insights.push({
            text: `${series.name}'s weighted task value decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint}`,
            icon: LuTrendingDown
          });
        }
      }
    });

    if (onInsightsGenerated) {
      onInsightsGenerated(insights);
    }
  }, [flattenedData, projectKeys, onInsightsGenerated]);

  useEffect(() => {
    if (!flattenedData?.length) return;

    const { sprints, allAssigneesSeries, assigneeSeries } = createLineChartData(flattenedData, projectKeys);

    // Filter assignee series based on search term
    const filteredAssigneeSeries = searchTerm
      ? assigneeSeries.filter(series => 
          series.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : assigneeSeries;

    // Create options for all assignees chart
    const allAssigneesOptions = {
      title: {
        text: "All Assignees Weighted Tasks per Sprint",
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
        name: "Weighted Task Value",
      },
      series: filteredAssigneeSeries,  // Only include filtered assignee series
    };

    // Create options for individual assignee charts
    const individualCharts = filteredAssigneeSeries.map((series) => ({
      title: {
        text: `Weighted Tasks per Sprint - ${series.name}`,
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
        name: "Weighted Task Value",
      },
      series: [series],
    }));

    setChartOptionsArray([allAssigneesOptions, ...individualCharts]);
  }, [flattenedData, projectKeys, searchTerm]);

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