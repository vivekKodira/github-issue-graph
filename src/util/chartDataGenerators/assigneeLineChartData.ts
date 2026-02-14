import { PROJECT_KEYS } from '@/config/projectKeys';
import { sortSprintsNumerically, NO_SPRINT_LABEL, getCreationMonth } from '@/util/commonFunctions';

export const createLineChartData = (tasks, projectKeys) => {
  const sprintData: Record<string, Record<string, number>> = {};
  const assigneeData: Record<string, boolean> = {};
  const allSprints = new Set<string>();
  const sprintStats = {
    totalTasks: 0,
    doneTasks: 0,
    tasksWithSprint: 0,
    tasksWithAssignees: 0,
    processedTasks: 0
  };

  // First pass: collect all sprints and basic stats
  tasks.forEach((task) => {
    sprintStats.totalTasks++;

    if (task.Status === "Done") {
      sprintStats.doneTasks++;
    }

    const sprint = task[projectKeys[PROJECT_KEYS.SPRINT].value];
    if (sprint) {
      sprintStats.tasksWithSprint++;
      // Normalize sprint format to remove extra spaces
      const normalizedSprint = sprint.replace(/\s+/g, ' ').trim();
      allSprints.add(normalizedSprint);
    }

    const taskAssignees = task.assignees && task.assignees.length > 0
      ? task.assignees
      : null;

    if (taskAssignees) {
      sprintStats.tasksWithAssignees++;
    }
  });

  // Second pass: process Done tasks (include no-sprint as NO_SPRINT_LABEL)
  tasks.forEach((task) => {
    if (task.Status !== "Done") {
      return; // Skip incomplete tasks
    }

    const sprint = task[projectKeys[PROJECT_KEYS.SPRINT].value];
    const normalizedSprint = (sprint && sprint.replace(/\s+/g, ' ').trim()) || NO_SPRINT_LABEL;
    allSprints.add(normalizedSprint);

    // Get task weight based on actual days or estimate days
    const actualDays = task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value];
    const estimateDays = task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value];
    const weight = actualDays || estimateDays || 1; // Default to 1 if neither is available

    // Process assignees
    const taskAssignees = task.assignees && task.assignees.length > 0
      ? task.assignees
      : null;  // Skip unassigned tasks

    if (!taskAssignees) return;  // Skip if no assignees

    sprintStats.processedTasks++;

    taskAssignees.forEach((assignee) => {
      if (!sprintData[normalizedSprint]) {
        sprintData[normalizedSprint] = {};
      }
      if (!sprintData[normalizedSprint][assignee]) {
        sprintData[normalizedSprint][assignee] = 0;
      }
      sprintData[normalizedSprint][assignee] += weight;
      assigneeData[assignee] = true;
    });
  });

  // Sort sprints numerically with NO_SPRINT_LABEL last
  const sprints = Object.keys(sprintData);
  const namedSprints = Array.from(allSprints).filter(s => s !== NO_SPRINT_LABEL);
  sortSprintsNumerically(namedSprints);
  const allSprintsSorted = allSprints.has(NO_SPRINT_LABEL) ? [...namedSprints, NO_SPRINT_LABEL] : namedSprints;
  const assignees = Object.keys(assigneeData);

  // Create series data for each assignee with all sprints included
  const assigneeSeries = assignees.map((assignee) => ({
    name: assignee,
    type: "line",
    data: allSprintsSorted.map((sprint) => sprintData[sprint]?.[assignee] || 0),
  }));

  return {
    sprints,
    allSprints: allSprintsSorted,
    assigneeSeries,
    sprintStats
  };
};

/** Same shape as createLineChartData but buckets by creation month (YYYY-MM). */
export const createLineChartDataByCreationDate = (tasks, projectKeys) => {
  const monthData: Record<string, Record<string, number>> = {};
  const allMonths = new Set<string>();

  tasks.forEach((task) => {
    if (task.Status !== "Done") return;
    const month = getCreationMonth(task);
    if (!month) return;
    const taskAssignees = task.assignees && task.assignees.length > 0 ? task.assignees : null;
    if (!taskAssignees) return;

    allMonths.add(month);
    if (!monthData[month]) monthData[month] = {};
    const actualDays = task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value];
    const estimateDays = task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value];
    const weight = actualDays || estimateDays || 1;

    taskAssignees.forEach((assignee) => {
      if (!monthData[month][assignee]) monthData[month][assignee] = 0;
      monthData[month][assignee] += weight;
    });
  });

  const assignees = [...new Set(Object.values(monthData).flatMap(m => Object.keys(m)))];
  const sortedMonths = Array.from(allMonths).sort();
  const assigneeSeries = assignees.map((assignee) => ({
    name: assignee,
    type: "line",
    data: sortedMonths.map((month) => monthData[month]?.[assignee] || 0),
  }));

  return {
    sprints: sortedMonths,
    allSprints: sortedMonths,
    assigneeSeries,
    sprintStats: { totalTasks: tasks.length, doneTasks: 0, tasksWithSprint: 0, tasksWithAssignees: 0, processedTasks: 0 }
  };
};
