import {
  getNumericFields,
  extractIssuesWithValues,
  getUnitFromFieldName,
  convertToMs,
  convertFromMs,
  calculateEndTime,
  scheduleTasks,
  calculateOutliers,
  calculateDeveloperWorkload,
  findCriticalPathTasks,
  filterScheduledTasks,
  calculateTotalDuration,
  calculateEstimate,
  calculateEstimationOutliers,
  ScheduledTask,
} from './timelinePlanningData';

describe('getNumericFields', () => {
  it('returns empty array for empty data', () => {
    expect(getNumericFields([], { Status: ['Done'] })).toEqual([]);
  });

  it('detects numeric fields', () => {
    const data = [{ Score: 5, Status: 'Done' }];
    const fields = { Score: ['5'], Status: ['Done'] };
    expect(getNumericFields(data, fields)).toEqual(['Score']);
  });

  it('detects string-numeric fields', () => {
    const data = [{ Hours: '8.5' }];
    expect(getNumericFields(data, { Hours: ['8.5'] })).toEqual(['Hours']);
  });

  it('skips non-numeric fields', () => {
    const data = [{ Name: 'Alice', Score: 5 }];
    expect(getNumericFields(data, { Name: ['Alice'], Score: ['5'] })).toEqual(['Score']);
  });

  it('checks customFields fallback', () => {
    const data = [{ customFields: { Effort: 3 } }];
    expect(getNumericFields(data, { Effort: ['3'] })).toEqual(['Effort']);
  });

  it('samples up to 5 items', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ Val: i === 3 ? 'text' : i }));
    expect(getNumericFields(data, { Val: ['0', '1', '2'] })).toEqual(['Val']);
  });

  it('returns sorted fields', () => {
    const data = [{ Zebra: 1, Alpha: 2 }];
    expect(getNumericFields(data, { Zebra: ['1'], Alpha: ['2'] })).toEqual(['Alpha', 'Zebra']);
  });
});

describe('extractIssuesWithValues', () => {
  it('returns empty for no field', () => {
    expect(extractIssuesWithValues('', [{ x: 1 }])).toEqual([]);
  });

  it('returns empty for empty data', () => {
    expect(extractIssuesWithValues('x', [])).toEqual([]);
  });

  it('extracts numeric values', () => {
    const data = [{ Score: 5 }, { Score: 10 }, { Score: 'abc' }];
    const result = extractIssuesWithValues('Score', data);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(5);
    expect(result[1].value).toBe(10);
  });

  it('extracts string-numeric values', () => {
    const result = extractIssuesWithValues('Hours', [{ Hours: '3.5' }]);
    expect(result[0].value).toBe(3.5);
  });

  it('filters positive only when requirePositive is set', () => {
    const data = [{ V: -1 }, { V: 0 }, { V: 5 }];
    const result = extractIssuesWithValues('V', data, { requirePositive: true });
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(5);
  });

  it('falls back to customFields', () => {
    const data = [{ customFields: { Effort: 7 } }];
    const result = extractIssuesWithValues('Effort', data);
    expect(result[0].value).toBe(7);
  });

  it('skips null/undefined values', () => {
    const data = [{ V: null }, { V: undefined }, { V: 3 }];
    const result = extractIssuesWithValues('V', data);
    expect(result).toHaveLength(1);
  });
});

describe('getUnitFromFieldName', () => {
  it('detects days', () => expect(getUnitFromFieldName('Estimate (days)')).toBe('days'));
  it('detects hours', () => expect(getUnitFromFieldName('Work Hours')).toBe('hours'));
  it('detects weeks', () => expect(getUnitFromFieldName('Duration in weeks')).toBe('weeks'));
  it('detects months', () => expect(getUnitFromFieldName('Monthly effort')).toBe('months'));
  it('defaults to units', () => expect(getUnitFromFieldName('Story Points')).toBe('units'));
});

describe('convertToMs / convertFromMs', () => {
  it('converts hours', () => {
    expect(convertToMs(1, 'hours')).toBe(3600000);
    expect(convertFromMs(3600000, 'hours')).toBe(1);
  });

  it('converts days', () => {
    expect(convertToMs(1, 'days')).toBe(86400000);
    expect(convertFromMs(86400000, 'days')).toBe(1);
  });

  it('converts weeks', () => {
    expect(convertToMs(1, 'weeks')).toBe(604800000);
    expect(convertFromMs(604800000, 'weeks')).toBe(1);
  });

  it('converts months', () => {
    expect(convertToMs(1, 'months')).toBe(2592000000);
    expect(convertFromMs(2592000000, 'months')).toBe(1);
  });

  it('defaults to hours for unknown unit', () => {
    expect(convertToMs(1, 'units')).toBe(3600000);
    expect(convertFromMs(3600000, 'units')).toBe(1);
  });
});

describe('calculateEndTime', () => {
  it('returns start + duration when no holidays', () => {
    const start = new Date('2024-01-15T08:00:00Z').getTime();
    const dur = 3600000; // 1 hour
    expect(calculateEndTime(start, dur, new Set())).toBe(start + dur);
  });

  it('returns start + duration when all days are holidays', () => {
    const start = new Date('2024-01-15T08:00:00Z').getTime();
    const dur = 3600000;
    expect(calculateEndTime(start, dur, new Set([0, 1, 2, 3, 4, 5, 6]))).toBe(start + dur);
  });

  it('skips holiday days', () => {
    // Jan 15 2024 is Monday (day 1)
    const start = new Date('2024-01-15T20:00:00Z').getTime();
    const dur = 8 * 3600000; // 8 hours
    // With Tuesday (2) as holiday, should skip it
    const result = calculateEndTime(start, dur, new Set([2]));
    // Should end after Wednesday start since Tuesday is skipped
    expect(result).toBeGreaterThan(new Date('2024-01-16T00:00:00Z').getTime());
  });
});

describe('scheduleTasks', () => {
  const issues = [
    { issue: { title: 'A', issue_number: 1 }, value: 5 },
    { issue: { title: 'B', issue_number: 2 }, value: 3 },
    { issue: { title: 'C', issue_number: 3 }, value: 8 },
  ];
  const baseTime = new Date('2024-01-15T00:00:00Z').getTime();

  it('returns empty for empty issues', () => {
    expect(scheduleTasks([], 2, 'days', 'largest-first', baseTime, [])).toEqual([]);
  });

  it('returns empty for 0 developers', () => {
    expect(scheduleTasks(issues, 0, 'days', 'largest-first', baseTime, [])).toEqual([]);
  });

  it('schedules with 1 developer sequentially', () => {
    const result = scheduleTasks(issues, 1, 'days', 'largest-first', baseTime, []);
    expect(result).toHaveLength(3);
    expect(result.every((t) => t.developerIndex === 0)).toBe(true);
  });

  it('distributes across multiple developers', () => {
    const result = scheduleTasks(issues, 2, 'days', 'largest-first', baseTime, []);
    expect(result).toHaveLength(3);
    const devs = new Set(result.map((t) => t.developerIndex));
    expect(devs.size).toBe(2);
  });

  it('sorts largest-first by default', () => {
    const result = scheduleTasks(issues, 1, 'days', 'largest-first', baseTime, []);
    expect(result[0].duration).toBe(8);
    expect(result[1].duration).toBe(5);
    expect(result[2].duration).toBe(3);
  });

  it('sorts smallest-first', () => {
    const result = scheduleTasks(issues, 1, 'days', 'smallest-first', baseTime, []);
    expect(result[0].duration).toBe(3);
    expect(result[1].duration).toBe(5);
    expect(result[2].duration).toBe(8);
  });

  it('preserves order for round-robin', () => {
    const result = scheduleTasks(issues, 1, 'days', 'round-robin', baseTime, []);
    expect(result[0].duration).toBe(5);
    expect(result[1].duration).toBe(3);
    expect(result[2].duration).toBe(8);
  });

  it('sets issue title and number', () => {
    const result = scheduleTasks(issues, 1, 'days', 'largest-first', baseTime, []);
    expect(result[0].issueTitle).toBe('C');
    expect(result[0].issueNumber).toBe(3);
  });

  it('handles missing title/number', () => {
    const result = scheduleTasks(
      [{ issue: {}, value: 1 }],
      1,
      'days',
      'largest-first',
      baseTime,
      []
    );
    expect(result[0].issueTitle).toBe('Untitled');
    expect(result[0].issueNumber).toBe('N/A');
  });
});

describe('calculateOutliers', () => {
  const tasks: ScheduledTask[] = [
    { issue: {}, developerIndex: 0, startTime: 0, endTime: 100, duration: 3, issueTitle: 'A', issueNumber: 1 },
    { issue: {}, developerIndex: 0, startTime: 100, endTime: 300, duration: 10, issueTitle: 'B', issueNumber: 2 },
    { issue: {}, developerIndex: 1, startTime: 0, endTime: 200, duration: 7, issueTitle: 'C', issueNumber: 3 },
  ];

  it('returns empty for invalid threshold', () => {
    expect(calculateOutliers(tasks, '')).toEqual([]);
    expect(calculateOutliers(tasks, 'abc')).toEqual([]);
    expect(calculateOutliers(tasks, '0')).toEqual([]);
    expect(calculateOutliers(tasks, '-1')).toEqual([]);
  });

  it('returns tasks above threshold', () => {
    const result = calculateOutliers(tasks, '5');
    expect(result).toHaveLength(2);
  });
});

describe('calculateDeveloperWorkload', () => {
  it('returns empty for no tasks', () => {
    expect(calculateDeveloperWorkload([])).toEqual({});
  });

  it('aggregates per developer', () => {
    const tasks: ScheduledTask[] = [
      { issue: {}, developerIndex: 0, startTime: 0, endTime: 100, duration: 3, issueTitle: 'A', issueNumber: 1 },
      { issue: {}, developerIndex: 0, startTime: 100, endTime: 300, duration: 5, issueTitle: 'B', issueNumber: 2 },
      { issue: {}, developerIndex: 1, startTime: 0, endTime: 200, duration: 7, issueTitle: 'C', issueNumber: 3 },
    ];
    const result = calculateDeveloperWorkload(tasks);
    expect(result[0]).toEqual({ total: 8, tasks: 2, maxEndTime: 300 });
    expect(result[1]).toEqual({ total: 7, tasks: 1, maxEndTime: 200 });
  });
});

describe('findCriticalPathTasks', () => {
  it('returns empty for no tasks', () => {
    expect(findCriticalPathTasks([], 2).size).toBe(0);
  });

  it('finds tasks ending at max time', () => {
    const tasks: ScheduledTask[] = [
      { issue: {}, developerIndex: 0, startTime: 0, endTime: 100000, duration: 3, issueTitle: 'A', issueNumber: 1 },
      { issue: {}, developerIndex: 0, startTime: 100000, endTime: 500000, duration: 5, issueTitle: 'B', issueNumber: 2 },
      { issue: {}, developerIndex: 1, startTime: 0, endTime: 300000, duration: 7, issueTitle: 'C', issueNumber: 3 },
    ];
    const result = findCriticalPathTasks(tasks, 2);
    expect(result.has(1)).toBe(true); // Task B ends at 500000 (max)
    expect(result.has(0)).toBe(false); // Task A ends at 100000 (not within 1s of max)
    expect(result.has(2)).toBe(false); // Task C ends at 300000
  });
});

describe('filterScheduledTasks', () => {
  const tasks: ScheduledTask[] = [
    { issue: {}, developerIndex: 0, startTime: 0, endTime: 100, duration: 3, issueTitle: 'A', issueNumber: 1 },
    { issue: {}, developerIndex: 0, startTime: 100, endTime: 500, duration: 10, issueTitle: 'B', issueNumber: 2 },
  ];
  const outliers = [tasks[1]];
  const criticalPath = new Set([1]);

  it('returns all for "all" mode', () => {
    expect(filterScheduledTasks(tasks, 'all', outliers, criticalPath)).toEqual(tasks);
  });

  it('returns outliers for "outliers-only" mode', () => {
    expect(filterScheduledTasks(tasks, 'outliers-only', outliers, criticalPath)).toEqual(outliers);
  });

  it('returns critical path for "critical-path" mode', () => {
    const result = filterScheduledTasks(tasks, 'critical-path', outliers, criticalPath);
    expect(result).toHaveLength(1);
    expect(result[0].issueTitle).toBe('B');
  });

  it('returns all for "workload-balance" mode', () => {
    expect(filterScheduledTasks(tasks, 'workload-balance', outliers, criticalPath)).toEqual(tasks);
  });
});

describe('calculateTotalDuration', () => {
  it('returns 0 for empty tasks', () => {
    expect(calculateTotalDuration([], 'days')).toBe(0);
  });

  it('calculates duration in days', () => {
    const oneDay = 86400000;
    const tasks: ScheduledTask[] = [
      { issue: {}, developerIndex: 0, startTime: 0, endTime: oneDay * 3, duration: 3, issueTitle: 'A', issueNumber: 1 },
      { issue: {}, developerIndex: 1, startTime: 0, endTime: oneDay * 5, duration: 5, issueTitle: 'B', issueNumber: 2 },
    ];
    expect(calculateTotalDuration(tasks, 'days')).toBe(5);
  });
});

describe('calculateEstimate', () => {
  it('returns null for empty issues', () => {
    expect(calculateEstimate([], 0, 1)).toBeNull();
  });

  it('returns null for 0 developers', () => {
    expect(calculateEstimate([{ issue: {}, value: 5 }], 1, 0)).toBeNull();
  });

  it('returns single value for single item', () => {
    expect(calculateEstimate([{ issue: {}, value: 5 }], 1, 3)).toBe(5);
  });

  it('divides total by developers for multiple items', () => {
    const issues = [{ issue: {}, value: 6 }, { issue: {}, value: 4 }];
    expect(calculateEstimate(issues, 2, 2)).toBe(5); // 10 / 2
  });
});

describe('calculateEstimationOutliers', () => {
  const issues = [
    { issue: {}, value: 3 },
    { issue: {}, value: 10 },
    { issue: {}, value: 7 },
  ];

  it('returns empty for invalid threshold', () => {
    expect(calculateEstimationOutliers(issues, '')).toEqual([]);
    expect(calculateEstimationOutliers(issues, '0')).toEqual([]);
  });

  it('returns items above threshold sorted desc', () => {
    const result = calculateEstimationOutliers(issues, '5');
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(10);
    expect(result[1].value).toBe(7);
  });
});
