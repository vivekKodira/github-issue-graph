// Pure functions extracted from TimelinePlanningChart and TimeEstimationWidget

export type SortStrategy = 'largest-first' | 'smallest-first' | 'round-robin';
export type ViewMode = 'all' | 'outliers-only' | 'critical-path' | 'workload-balance';

export interface ScheduledTask {
  issue: unknown;
  developerIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  issueTitle: string;
  issueNumber: string | number;
}

export interface IssueWithValue {
  issue: unknown;
  value: number;
}

/**
 * Detect numeric fields from data by sampling
 */
export const getNumericFields = (
  filteredData: unknown[],
  filterableFields: Record<string, string[]>
): string[] => {
  const fields: string[] = [];

  if (!filteredData || filteredData.length === 0) {
    return fields;
  }

  Object.keys(filterableFields).forEach((fieldName) => {
    const sampleSize = Math.min(5, filteredData.length);
    let hasNumericValue = false;

    for (let i = 0; i < sampleSize; i++) {
      const issue = filteredData[i];
      const value =
        (issue as Record<string, unknown>)[fieldName] ??
        (issue as { customFields?: Record<string, unknown> })?.customFields?.[fieldName];

      if (value !== null && value !== undefined) {
        const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
          hasNumericValue = true;
          break;
        }
      }
    }

    if (hasNumericValue) {
      fields.push(fieldName);
    }
  });

  return fields.sort();
};

/**
 * Extract issues with their numeric values for a given field
 */
export const extractIssuesWithValues = (
  selectedField: string,
  filteredData: unknown[],
  options?: { requirePositive?: boolean }
): IssueWithValue[] => {
  if (!selectedField || !filteredData || filteredData.length === 0) {
    return [];
  }

  const issues: IssueWithValue[] = [];

  filteredData.forEach((issue) => {
    const rawValue =
      (issue as Record<string, unknown>)[selectedField] ??
      (issue as { customFields?: Record<string, unknown> })?.customFields?.[selectedField];

    if (rawValue !== null && rawValue !== undefined) {
      const numValue = typeof rawValue === 'string' ? parseFloat(rawValue) : Number(rawValue);
      if (!isNaN(numValue) && isFinite(numValue)) {
        if (options?.requirePositive && numValue <= 0) return;
        issues.push({ issue, value: numValue });
      }
    }
  });

  return issues;
};

/**
 * Get unit string from field name
 */
export const getUnitFromFieldName = (fieldName: string): string => {
  const lower = fieldName.toLowerCase();
  if (lower.includes('day')) return 'days';
  if (lower.includes('hour')) return 'hours';
  if (lower.includes('week')) return 'weeks';
  if (lower.includes('month')) return 'months';
  return 'units';
};

/**
 * Convert estimation value to milliseconds based on unit
 */
export const convertToMs = (value: number, unit: string): number => {
  if (unit === 'hours') return value * 1000 * 60 * 60;
  if (unit === 'days') return value * 1000 * 60 * 60 * 24;
  if (unit === 'weeks') return value * 1000 * 60 * 60 * 24 * 7;
  if (unit === 'months') return value * 1000 * 60 * 60 * 24 * 30;
  return value * 1000 * 60 * 60; // default: hours
};

/**
 * Convert milliseconds to the appropriate unit
 */
export const convertFromMs = (ms: number, unit: string): number => {
  if (unit === 'hours') return ms / (1000 * 60 * 60);
  if (unit === 'days') return ms / (1000 * 60 * 60 * 24);
  if (unit === 'weeks') return ms / (1000 * 60 * 60 * 24 * 7);
  if (unit === 'months') return ms / (1000 * 60 * 60 * 24 * 30);
  return ms / (1000 * 60 * 60); // default: hours
};

/**
 * Calculate end time considering holiday days
 */
export const calculateEndTime = (
  start: number,
  durationMs: number,
  holidayDays: Set<number>
): number => {
  if (holidayDays.size === 7) return start + durationMs;

  let current = new Date(start);
  let remaining = durationMs;

  while (remaining > 0) {
    const day = current.getDay();
    const nextDay = new Date(current);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    const msUntilNextDay = nextDay.getTime() - current.getTime();

    if (holidayDays.has(day)) {
      current = nextDay;
    } else {
      const timeToAdvance = Math.min(remaining, msUntilNextDay);
      current = new Date(current.getTime() + timeToAdvance);
      remaining -= timeToAdvance;
    }
  }
  return current.getTime();
};

/**
 * Schedule tasks using a greedy algorithm
 */
export const scheduleTasks = (
  issuesWithValues: IssueWithValue[],
  numDevelopers: number,
  unit: string,
  sortStrategy: SortStrategy,
  baseTime: number,
  holidays: number[]
): ScheduledTask[] => {
  if (issuesWithValues.length === 0 || numDevelopers < 1) {
    return [];
  }

  let sortedIssues = [...issuesWithValues];
  switch (sortStrategy) {
    case 'largest-first':
      sortedIssues.sort((a, b) => b.value - a.value);
      break;
    case 'smallest-first':
      sortedIssues.sort((a, b) => a.value - b.value);
      break;
    case 'round-robin':
      break;
    default:
      sortedIssues.sort((a, b) => b.value - a.value);
  }

  const developerAvailability: number[] = new Array(numDevelopers).fill(0);
  const scheduled: ScheduledTask[] = [];
  const holidaySet = new Set(holidays);

  sortedIssues.forEach(({ issue, value }) => {
    let earliestDeveloper = 0;
    let earliestTime = developerAvailability[0];

    for (let i = 1; i < numDevelopers; i++) {
      if (developerAvailability[i] < earliestTime) {
        earliestTime = developerAvailability[i];
        earliestDeveloper = i;
      }
    }

    const durationMs = convertToMs(value, unit);
    const startTime = baseTime + earliestTime;
    const endTime = calculateEndTime(startTime, durationMs, holidaySet);

    const issueObj = issue as {
      title?: string;
      issue_number?: number;
      number?: number;
      id?: string;
    };

    scheduled.push({
      issue,
      developerIndex: earliestDeveloper,
      startTime,
      endTime,
      duration: value,
      issueTitle: issueObj.title || 'Untitled',
      issueNumber: issueObj.issue_number || issueObj.number || issueObj.id || 'N/A',
    });

    developerAvailability[earliestDeveloper] = endTime - baseTime;
  });

  return scheduled;
};

/**
 * Calculate outliers based on threshold
 */
export const calculateOutliers = (
  scheduledTasks: ScheduledTask[],
  outlierThreshold: string
): ScheduledTask[] => {
  const threshold = parseFloat(outlierThreshold);
  if (isNaN(threshold) || threshold <= 0) return [];
  return scheduledTasks.filter((task) => task.duration > threshold);
};

/**
 * Calculate workload per developer
 */
export const calculateDeveloperWorkload = (
  scheduledTasks: ScheduledTask[]
): Record<number, { total: number; tasks: number; maxEndTime: number }> => {
  const workload: Record<number, { total: number; tasks: number; maxEndTime: number }> = {};
  scheduledTasks.forEach((task) => {
    if (!workload[task.developerIndex]) {
      workload[task.developerIndex] = { total: 0, tasks: 0, maxEndTime: 0 };
    }
    workload[task.developerIndex].total += task.duration;
    workload[task.developerIndex].tasks += 1;
    workload[task.developerIndex].maxEndTime = Math.max(
      workload[task.developerIndex].maxEndTime,
      task.endTime
    );
  });
  return workload;
};

/**
 * Find critical path tasks (tasks on the longest developer path)
 */
export const findCriticalPathTasks = (
  scheduledTasks: ScheduledTask[],
  numDevelopers: number
): Set<number> => {
  if (scheduledTasks.length === 0) return new Set();

  const developerEndTimes = new Array(numDevelopers).fill(0);
  scheduledTasks.forEach((task) => {
    developerEndTimes[task.developerIndex] = Math.max(
      developerEndTimes[task.developerIndex],
      task.endTime
    );
  });
  const maxTime = Math.max(...developerEndTimes);

  const criticalSet = new Set<number>();
  scheduledTasks.forEach((task, index) => {
    if (task.endTime >= maxTime - 1000) {
      criticalSet.add(index);
    }
  });
  return criticalSet;
};

/**
 * Filter scheduled tasks based on view mode
 */
export const filterScheduledTasks = (
  scheduledTasks: ScheduledTask[],
  viewMode: ViewMode,
  outliers: ScheduledTask[],
  criticalPathTasks: Set<number>
): ScheduledTask[] => {
  switch (viewMode) {
    case 'outliers-only':
      return outliers;
    case 'critical-path':
      return scheduledTasks.filter((_, index) => criticalPathTasks.has(index));
    case 'workload-balance':
    case 'all':
    default:
      return scheduledTasks;
  }
};

/**
 * Calculate total project duration
 */
export const calculateTotalDuration = (
  scheduledTasks: ScheduledTask[],
  unit: string
): number => {
  if (scheduledTasks.length === 0) return 0;
  const maxEndTime = Math.max(...scheduledTasks.map((t) => t.endTime));
  const minStartTime = Math.min(...scheduledTasks.map((t) => t.startTime));
  return convertFromMs(maxEndTime - minStartTime, unit);
};

/**
 * Calculate estimate for TimeEstimationWidget
 */
export const calculateEstimate = (
  issuesWithValues: IssueWithValue[],
  totalItems: number,
  numDevelopers: number
): number | null => {
  if (issuesWithValues.length === 0 || numDevelopers < 1) return null;

  const values = issuesWithValues.map((item) => item.value);

  if (totalItems === 1) {
    return values[0] || 0;
  }

  const total = values.reduce((sum, val) => sum + val, 0);
  return total / numDevelopers;
};

/**
 * Calculate outliers for estimation (values above threshold, sorted desc)
 */
export const calculateEstimationOutliers = (
  issuesWithValues: IssueWithValue[],
  outlierThreshold: string
): IssueWithValue[] => {
  const threshold = parseFloat(outlierThreshold);
  if (isNaN(threshold) || threshold <= 0) return [];
  return issuesWithValues
    .filter((item) => item.value > threshold)
    .sort((a, b) => b.value - a.value);
};
