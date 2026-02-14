// Pure functions extracted from SprintVelocityChart

import { sortSprintsNumerically, NO_SPRINT_LABEL } from '@/util/commonFunctions';

export interface Insight {
  text: string;
  severity: number;
}

interface TaskLike {
  Status?: string;
  [key: string]: unknown;
}

interface SprintData {
  sprint: string;
  tasks: TaskLike[];
}

/**
 * Group done tasks by sprint, returning sorted sprint names and data
 */
export const groupTasksBySprint = (
  flattenedData: TaskLike[],
  sprintKey: string
): { sortedSprints: string[]; sprintData: Record<string, SprintData> } => {
  const sprintData: Record<string, SprintData> = {};
  const sprints = new Set<string>();

  flattenedData.forEach((task) => {
    if (task.Status !== 'Done') return;

    const sprint = (task[sprintKey] as string) || NO_SPRINT_LABEL;
    sprints.add(sprint);
    if (!sprintData[sprint]) {
      sprintData[sprint] = { sprint, tasks: [] };
    }
    sprintData[sprint].tasks.push(task);
  });

  const namedSprints = Array.from(sprints).filter((s) => s !== NO_SPRINT_LABEL);
  sortSprintsNumerically(namedSprints);
  const sortedSprints = sprints.has(NO_SPRINT_LABEL)
    ? [...namedSprints, NO_SPRINT_LABEL]
    : namedSprints;

  return { sortedSprints, sprintData };
};

/**
 * Generate velocity insights by comparing latest sprints
 */
export const generateVelocityInsights = (
  flattenedData: TaskLike[],
  sprintKey: string,
  actualDaysKey: string
): Insight[] => {
  const { sprintData } = groupTasksBySprint(flattenedData, sprintKey);

  const sprints = new Set<string>();
  flattenedData.forEach((task) => {
    if (task.Status !== 'Done') return;
    sprints.add((task[sprintKey] as string) || NO_SPRINT_LABEL);
  });

  const namedSprints = Array.from(sprints).filter((s) => s !== NO_SPRINT_LABEL);
  sortSprintsNumerically(namedSprints);

  const insights: Insight[] = [];

  if (namedSprints.length < 2) return insights;

  const currentSprint = namedSprints[namedSprints.length - 1];
  const previousSprint = namedSprints[namedSprints.length - 2];

  const currentTasks = sprintData[currentSprint].tasks.length;
  const previousTasks = sprintData[previousSprint].tasks.length;

  if (currentTasks < previousTasks) {
    const decrease = (((previousTasks - currentTasks) / previousTasks) * 100).toFixed(1);
    const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20)));
    insights.push({
      text: `Sprint velocity decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint} (${currentTasks} vs ${previousTasks} tasks)`,
      severity,
    });
  }

  const currentEffort = sprintData[currentSprint].tasks.reduce(
    (total, task) => total + Number(task[actualDaysKey]) || 0,
    0
  );
  const previousEffort = sprintData[previousSprint].tasks.reduce(
    (total, task) => total + Number(task[actualDaysKey]) || 0,
    0
  );

  if (currentEffort < previousEffort) {
    const decrease = (((previousEffort - currentEffort) / previousEffort) * 100).toFixed(1);
    const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20)));
    insights.push({
      text: `Sprint effort decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint} (${currentEffort.toFixed(1)} vs ${previousEffort.toFixed(1)} days)`,
      severity,
    });
  }

  return insights;
};
