import { PROJECT_KEYS } from '@/config/projectKeys';

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
