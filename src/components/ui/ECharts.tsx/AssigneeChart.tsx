import { ECharts } from "@/components/ui/ECharts.tsx/ECharts.tsx";
import { useState, useEffect } from "react";
import barChartTemplate from "./templates/barChartTemplate.js";

export const createChartData = (tasks) => {
  const result = {
    stackedBySize: {
      categories: [],
      series: [],
    },
  };

  const assignees = new Set();
  const sizeTypes = new Set();
  const assigneeToSizeCount = {};

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
      const size = task.Size || "No Size";
      sizeTypes.add(size);
      assigneeToSizeCount[assignee][size] =
        (assigneeToSizeCount[assignee][size] || 0) + 1;
    });
  });

  // Prepare stacked chart data for sizes
  result.stackedBySize.categories = Array.from(assignees);
  result.stackedBySize.series = Array.from(sizeTypes).map((size) => {
    return {
      name: size,
      type: "bar",
      stack: "sizes",
      data: Array.from(assignees).map(
        (assignee) =>
          (assigneeToSizeCount[assignee] &&
            assigneeToSizeCount[assignee][size]) ||
          0
      ),
      emphasis: {
        focus: "series",
      },
    };
  });

  return result;
};

export const AssigneeChart = ({ flattenedData, styleOptions }) => {
  const [chartOptions, setChartOptions] = useState(null);
  useEffect(() => {
    const chartData = createChartData(flattenedData);
    const chartOptions = JSON.parse(JSON.stringify(barChartTemplate));
    chartOptions.xAxis.data = chartData?.stackedBySize?.categories || [];
    chartOptions.series = chartData?.stackedBySize?.series || [];

    setChartOptions(chartOptions);
  }, [flattenedData]);
  return (
    <div className="chartContainer">
      {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
    </div>
  );
};
