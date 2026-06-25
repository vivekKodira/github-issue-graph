import { PROJECT_KEYS } from "@/config/projectKeys";

/**
 * Completion-metric helpers, extracted from ProjectDashboard so they can be
 * reused outside the dashboard (e.g. by the question/answer views).
 *
 * `tasks` is the flattened `TaskFormat` array. `projectKeys` is the mapping
 * provided by `useProjectKeys()` — fields are read via
 * `projectKeys[PROJECT_KEYS.X].value`, never hardcoded names.
 */

type Task = Record<string, unknown>;
type ProjectKeys = Record<string, { value: string }>;

/** Fraction of tasks whose Status is "Done" (count-based completion). */
export const fetchPlannedTaskCompletedCount = (tasks: Task[]): number => {
  if (!tasks?.length) return 0;
  const completedTasks = tasks.filter((task) => task.Status === "Done");
  return completedTasks.length / tasks.length;
};

/**
 * Actual effort spent on Done tasks divided by the total planned (estimated)
 * effort across all tasks. Returns -1 when there is no planned effort.
 */
export const fetchPlannedTaskCompletedData = (
  tasks: Task[],
  projectKeys: ProjectKeys
): number => {
  const completedTasks = tasks.filter((task) => task.Status === "Done");
  const totalEffort = completedTasks.reduce((sum, task) => {
    return sum + (Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0);
  }, 0);

  const totalPlannedEffort = tasks.reduce((sum, task) => {
    return sum + (Number(task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value]) || 0);
  }, 0);

  if (totalPlannedEffort == 0) {
    return -1;
  }
  return totalEffort / totalPlannedEffort;
};

/**
 * Actual effort spent on Done tasks divided by the project-level planned
 * effort. Returns -1 when no project-level planned effort is configured.
 */
export const fetchoverAllCompletedData = (
  tasks: Task[],
  plannedEffortForProject: number,
  projectKeys: ProjectKeys
): number => {
  const completedTasks = tasks.filter((task) => task.Status === "Done");
  const totalEffort = completedTasks.reduce((sum, task) => {
    return sum + (Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0);
  }, 0);
  if (plannedEffortForProject == 0) {
    return -1;
  }
  return totalEffort / plannedEffortForProject;
};
