import { PROJECT_KEYS } from '@/config/projectKeys';

export const createPieChartData = (tasks, projectKeys) => {
  const assigneeData = {};

  tasks.forEach((task) => {
    if (task.Status !== "Done") {
      return; // Skip incomplete tasks
    }

    // Skip tasks with no assignees
    if (!task.assignees || task.assignees.length === 0) {
      return;
    }

    // Process assignees
    task.assignees.forEach((assignee) => {
      if (!assigneeData[assignee]) {
        assigneeData[assignee] = {};
      }

      const size = task[projectKeys[PROJECT_KEYS.SIZE].value] || "No Size";
      assigneeData[assignee][size] = (assigneeData[assignee][size] || 0) + 1;
    });
  });

  // Convert to series data format for each assignee
  return Object.entries(assigneeData).map(([assignee, sizeData]) => ({
    assignee,
    data: Object.entries(sizeData).map(([size, count]) => ({
      name: size,
      value: count
    }))
  }));
};

/** Data for "Tasks by Assignee" when user selects a complexity/size: size -> [{ name: assignee, value: count }] */
export const createAssigneesBySizePieData = (tasks, projectKeys) => {
  const bySize: Record<string, Record<string, number>> = {};
  tasks.forEach((task) => {
    if (task.Status !== "Done") return;
    if (!task.assignees || task.assignees.length === 0) return;
    const size = task[projectKeys[PROJECT_KEYS.SIZE].value] || "No Size";
    if (!bySize[size]) bySize[size] = {};
    task.assignees.forEach((assignee: string) => {
      bySize[size][assignee] = (bySize[size][assignee] || 0) + 1;
    });
  });
  const result: Record<string, Array<{ name: string; value: number }>> = {};
  Object.entries(bySize).forEach(([size, assigneeCounts]) => {
    result[size] = Object.entries(assigneeCounts).map(([name, value]) => ({ name, value }));
  });
  return result;
};
