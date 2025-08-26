import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect } from "react";
import barChartTemplate from "./templates/barChartTemplate.js";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { ErrorBoundary } from "./ErrorBoundary";

interface ChartData {
  stackedBySize: {
    categories: string[];
    series: Array<{
      name: string;
      type: string;
      stack?: string;
      data: number[];
      emphasis: {
        focus: string;
      };
    }>;
  };
}

export const createChartData = (tasks, projectKeys): ChartData => {
  const result: ChartData = {
    stackedBySize: {
      categories: [],
      series: [],
    },
  };

  const assignees = new Set<string>();
  const sizeTypes = new Set<string>();
  const assigneeToSizeCount: Record<string, Record<string, number>> = {};

  tasks.forEach((task) => {
    if (task.Status !== "Done") {
      return; // Skip incomplete tasks
    }

    // Process assignees
    const taskAssignees =
      task.assignees && task.assignees.length > 0
        ? task.assignees
        : ["Unassigned"];

    taskAssignees.forEach((assignee) => {
      assignees.add(assignee);
      assigneeToSizeCount[assignee] = assigneeToSizeCount[assignee] || {};
      const size = task[projectKeys[PROJECT_KEYS.SIZE].value] || "No Size";
      sizeTypes.add(size);
      assigneeToSizeCount[assignee][size] =
        (assigneeToSizeCount[assignee][size] || 0) + 1;
    });
  });

  // Prepare chart data - handle both stacked and regular bar charts
  result.stackedBySize.categories = Array.from(assignees);
  result.stackedBySize.series = Array.from(sizeTypes).map((size) => {
    return {
      name: size,
      type: "bar",
      // Only use stack property if there are multiple size types
      ...(sizeTypes.size > 1 ? { stack: "sizes" } : {}),
      data: Array.from(assignees).map(
        (assignee) =>
          (assigneeToSizeCount[assignee] &&
            assigneeToSizeCount[assignee][size]) ||
          0
      ),
      emphasis: {
        focus: sizeTypes.size > 1 ? "series" : "self",
      },
    };
  });

  return result;
};

export const AssigneeChart = ({ flattenedData, styleOptions, searchTerm }) => {
  const { projectKeys } = useProjectKeys();
  const [chartOptions, setChartOptions] = useState(null);
  
  useEffect(() => {
    const chartData = createChartData(flattenedData, projectKeys);
    
    // Filter data based on search term
    if (searchTerm) {
      const filteredCategories = chartData.stackedBySize.categories.filter(category =>
        category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // Update categories and data arrays
      chartData.stackedBySize.categories = filteredCategories;
      chartData.stackedBySize.series = chartData.stackedBySize.series.map(series => ({
        ...series,
        data: series.data.filter((_, index) => 
          chartData.stackedBySize.categories.includes(chartData.stackedBySize.categories[index])
        )
      }));
    }

    const chartOptions = JSON.parse(JSON.stringify(barChartTemplate));
    chartOptions.xAxis.data = chartData?.stackedBySize?.categories || [];
    chartOptions.series = chartData?.stackedBySize?.series || [];
    if(chartOptions.series[0].data.length <=1) {
      return;
    }
    setChartOptions(chartOptions);
  }, [flattenedData, projectKeys, searchTerm]);
  
  return (
    <div >
      {chartOptions && (
        <ErrorBoundary chartName="Assignee">
          <ECharts option={chartOptions} style={styleOptions} />
        </ErrorBoundary>
      )}
    </div>
  );
};
